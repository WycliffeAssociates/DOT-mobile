import { IonButton, IonIcon, IonModal } from "@ionic/react";
import { close } from "ionicons/icons";
import { settingsOutline } from "ionicons/icons";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { VideoJsPlayer } from "video.js";
import {
	IPlaylistData,
	IVidWithCustom,
	downloadProgressInfo,
	validPlaylistSlugs,
} from "../customTypes/types";
import {
	getChaptersArrFromVtt,
	getCurrentPlaylistDataFs,
	updateStateFromFs,
} from "../lib/Ui";
import { makeVidSaver } from "../lib/storage";
import { BulkListing } from "./Settings/BulkListing";
import { SpeedControl } from "./Settings/SpeedControl";

type ISettings = {
	player: VideoJsPlayer | undefined;
	playlistData: IPlaylistData;
	playlistSlug: validPlaylistSlugs;
	currentBook: IVidWithCustom[];
	currentVid: IVidWithCustom;
	setCurrentBook: Dispatch<SetStateAction<IVidWithCustom[]>>;
	setShapedPlaylist: Dispatch<SetStateAction<IPlaylistData | undefined>>;
	setCurrentVid: Dispatch<SetStateAction<IVidWithCustom>>;
};
export function Settings(props: ISettings) {
	const modal = useRef<HTMLIonModalElement>(null);
	const settingsRef = useRef<HTMLDivElement>(null);
	const [downloadProgress, setDownloadProgress] =
		useState<downloadProgressInfo>();
	const { t } = useTranslation();

	async function saveVidOffline(
		vidToSave: IVidWithCustom = props.currentVid,
		playlistData: IPlaylistData = props.playlistData,
		vidForState: IVidWithCustom = props.currentVid,
	) {
		const vidName =
			vidToSave.name || vidToSave.reference_id || vidToSave.id || "Unnamed Vid";
		setDownloadProgress({
			amount: 0,
			started: true,
			vidName,
			vidId: vidToSave.id || "",
		});
		const vidSaver = makeVidSaver(props.playlistSlug, vidToSave);

		if (!vidToSave.book) return;

		const playlistClone = JSON.parse(JSON.stringify(playlistData));
		const currentVidInThatClone = playlistClone.formattedVideos[
			vidToSave.book
		].find((vid: IVidWithCustom) => vid.id === vidToSave.id);
		if (!currentVidInThatClone) return;

		await vidSaver.ensurePlaylistDirExists();
		// Get the mp4 src for later;
		const smallestMp4 = vidSaver.getSmallestMp4();
		if (!smallestMp4) return;
		// Save the poster src adn blob
		const posterSrc = await vidSaver.savePosterBlobAndGetSrc();

		if (!currentVidInThatClone.savedSources) {
			currentVidInThatClone.savedSources = {};
		}
		currentVidInThatClone.savedSources.poster = posterSrc;

		// Get Chapter markers saved if they weren't for some reason
		if (!currentVidInThatClone.chapterMarkers && props.player) {
			const chapters = await getChaptersArrFromVtt(vidToSave, false);
			if (
				chapters?.length &&
				chapters?.every((chap) => {
					return (
						chap.xPos?.toLowerCase() !== "nan" && typeof chap.xPos === "string"
					);
				})
			) {
				currentVidInThatClone.chapterMarkers = chapters ? chapters : [];
			}
		}

		const fileSize = await vidSaver.getFileSize(smallestMp4.src);
		if (!fileSize) return;
		const { chunksRequestsToMake, allExpectedChunks } =
			await vidSaver.calculateNeededRangesToFetch(fileSize);
		const alreadyFetched =
			allExpectedChunks.length - chunksRequestsToMake.length;
		let fetchNum = alreadyFetched === 0 ? 1 : alreadyFetched;
		const fetchSession = [...chunksRequestsToMake]; //need a copy to mutate in method below;

		function bookDownloadRequestIsAborted() {
			if (
				window.dotAppBooksToCancel &&
				Array.isArray(window.dotAppBooksToCancel) &&
				window.dotAppBooksToCancel.some((bookToCancel) =>
					bookToCancel.toLowerCase().includes(vidToSave.id || ""),
				)
			) {
				return true;
			}
		}
		function breakLoop() {
			if (window.dotAppStopAllDownloads) {
				return true;
			}
			if (bookDownloadRequestIsAborted()) {
				return true;
			}
			return false;
		}

		for await (const segmentToFetch of chunksRequestsToMake) {
			if (!breakLoop()) {
				await vidSaver.writeBlobChunk({
					segmentToFetch,
					url: smallestMp4.src,
				});
				await vidSaver.updateWipAndGetNewFetchSession(fetchSession);
				let progressAmount = fetchNum / allExpectedChunks.length;
				if (progressAmount === 1) {
					// artificially set the progress at just below 100 to finish up this last bit of code in which we are cleaning caches / combining the blob parts etc;
					progressAmount = 0.98;
				}
				const updatedAmount = {
					started: true,
					amount: progressAmount,
					vidName,
					vidId: vidToSave.id || "",
				};
				setDownloadProgress(updatedAmount);
				fetchNum += 1;
			}
		}

		const result =
			await vidSaver.aggregateWipBlobsIntoOneAndWriteFs(allExpectedChunks);
		// todo maybe?: some error handling here? Returning here is fine right now, the jobs that called it just assumes the download completed, the state is read from fs as source of truth (so no falsy UI since we don't actually combine the final blob). This right now just means that some fetch went wrong (don't know why), but if the job is started again from here, well, no big problem.
		if (result && !result.ok) return;
		const mp4FsSource = await vidSaver.getCapacitorSrcForFinalBlob();
		currentVidInThatClone.savedSources.video = mp4FsSource;
		currentVidInThatClone.savedSources.dateSavedIso = new Date().toISOString();

		await vidSaver.deleteWipChunkedVidBlobs();
		await vidSaver.deleteWipPrefsData();
		await vidSaver.updateCachedPlaylist(playlistClone);

		await vidSaver.updateCachedPlaylist(playlistClone);
		// update in memory
		await updateStateFromFs({
			playlistSlug: props.playlistSlug,
			vid: vidForState,
			setShapedPlaylist: props.setShapedPlaylist,
			setCurrentBook: props.setCurrentBook,
			setCurrentVid: props.setCurrentVid,
		});
		setDownloadProgress({
			amount: 1,
			started: true,
			vidName,
			vidId: vidToSave.id || "",
		});
	}

	function dismiss() {
		modal.current?.dismiss();
		props.player?.play();
	}

	//=============== EFFECTS  =============

	async function handleSingleVidDownload(vid: IVidWithCustom) {
		const currentPlaylistData = await getCurrentPlaylistDataFs(
			props.playlistSlug,
		);
		await saveVidOffline(vid, currentPlaylistData, vid);
		setTimeout(() => {
			setDownloadProgress({
				amount: 0,
				started: false,
				vidName: vid.name || "",
				vidId: vid.id || "",
			});
		}, 1000);
	}
	async function handleSingleVidDelete(vid: IVidWithCustom) {
		const vidSaver = makeVidSaver(props.playlistSlug, vid);
		const currentPlaylistData = await getCurrentPlaylistDataFs(
			props.playlistSlug,
		);
		if (currentPlaylistData) {
			await vidSaver.deleteAllVidData(currentPlaylistData, vid);
		}
		await updateStateFromFs({
			playlistSlug: props.playlistSlug,
			vid: vid,
			setShapedPlaylist: props.setShapedPlaylist,
			setCurrentBook: props.setCurrentBook,
			setCurrentVid: props.setCurrentVid,
		});
	}
	useEffect(() => {
		if (settingsRef?.current) {
			if (!settingsRef.current.dataset.listening) {
				settingsRef.current.addEventListener(
					"manageSingleVideoStorage",
					(event: Event) => {
						const customEvent = event as CustomEvent;
						if (customEvent.detail) {
							const videoToSave = customEvent.detail.video as IVidWithCustom;
							const action = customEvent.detail.action;

							if (action === "DOWNLOAD") {
								handleSingleVidDownload(videoToSave);
							} else if (action === "DELETE") {
								handleSingleVidDelete(videoToSave);
							}
						}
					},
				);
				settingsRef.current.dataset.listening = "true";
			}
		}
	}, []);

	return (
		<>
			<div className="flex" id="settingsRef" ref={settingsRef}>
				<IonButton
					id="open-modal"
					shape="round"
					fill="clear"
					className="text-surface focus:(ring ring-solid ring-primary ring-offset-2) rounded-999px h-6 w-10"
					style={{
						"--padding-start": 0,
						"--padding-end": 0,
						"--background-activated": "transparent",
						"--background-focused": "transparent",
					}}
				>
					<IonIcon color="dark" slot="icon-only" icon={settingsOutline} />
				</IonButton>
			</div>
			<IonModal
				ref={modal}
				onIonModalDidPresent={() => props.player?.pause()}
				onDidDismiss={() => props.player?.play()}
				trigger="open-modal"
				className="grid place-content-end"
			>
				<div className="block h-[90vh]  p-2 overflow-auto pt-5 px-5 relative">
					<div className="w-full flex justify-end relative ">
						<IonButton
							fill="outline"
							size="small"
							shape="round"
							style={{
								"--padding-start": "0",
								"--padding-end": 0,
								"--color": "#9c2921",
								"--border-color": "#9c2921",
							}}
							onClick={() => dismiss()}
						>
							<IonIcon className="" slot="icon-only" icon={close} />
						</IonButton>
					</div>
					<SpeedControl player={props.player} />
					<div data-name="downloadSection" className="sticky top-0 bg-white">
						<h2 className="font-bold mb-4">{t("downloadOptions")}</h2>
					</div>
					<BulkListing
						downloadProgress={downloadProgress}
						setCurrentBook={props.setCurrentBook}
						setCurrentVid={props.setCurrentVid}
						playlistSlug={props.playlistSlug}
						playlistData={props.playlistData}
						setDownloadProgress={setDownloadProgress}
						saveVidOffline={saveVidOffline}
						currentBook={props.currentBook}
						currentVid={props.currentVid}
						setShapedPlaylist={props.setShapedPlaylist}
					/>
				</div>
			</IonModal>
		</>
	);
}
