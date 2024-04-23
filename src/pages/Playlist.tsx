import { Preferences } from "@capacitor/preferences";
import {
	IonAlert,
	IonContent,
	IonHeader,
	IonLoading,
	IonPage,
	IonToolbar,
	useIonViewWillEnter,
} from "@ionic/react";
import { IonButton } from "@ionic/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import brightCovePlaylistConfig from "../brightcove/playlist-mappers";
import { ChapterSelector } from "../components/ChapterSelector";
import { ArrowBack, DotLogo } from "../components/Icons";
import { JumpDisplay } from "../components/JumpDisplay";
import { VidJsPlayer } from "../components/Player";
import { PlaylistBookPicker } from "../components/PlaylistBookPicker";
import { PlaylistInfo } from "../components/PlaylistInfo";
import { Settings } from "../components/Settings";
import { VerseSegmentJump } from "../components/VerseSegmentJump";
import type {
	IPlaylistData,
	IPlaylistResponse,
	IVidWithCustom,
	IappState,
	IvidJsPlayer,
	changePlayerSrcParams,
	changeVidParams,
	formattedPlaylist,
} from "../customTypes/types";
import {
	cacheBcPlaylistJson,
	distributeChapterMarkers,
	fetchBcData,
	getChaptersArrFromVtt,
	getCurrentPlaylistDataFs,
} from "../lib/Ui";
import {
	getSavedAppPreferences,
	updateSavedAppPreferences,
} from "../lib/storage";
import { groupObjectsByKey, massageVidsArray } from "../lib/utils";

function Playlist() {
	const { playlist: urlSlug } = useParams<{ playlist: string }>();

	const playInfo = Object.values(brightCovePlaylistConfig).find(
		(value) => value.path === urlSlug,
	);
	if (!playInfo) return null;
	const playlistInfo = playInfo; //@ extra assignemnt for typescripts narrowing
	const { t } = useTranslation();
	const [isFetching, setIsFetching] = useState(true);
	const [shapedPlaylist, setShapedPlaylist] = useState<IPlaylistData>();
	const [vidJsPlayer, setVidJsPlayer] = useState<IvidJsPlayer>();
	const [currentBook, setCurrentBook] = useState<IVidWithCustom[]>(
		{} as IVidWithCustom[],
	);
	const [currentVid, setCurrentVid] = useState<IVidWithCustom>(
		{} as IVidWithCustom,
	);
	const [showChapSliderButtons, setShowChapSliderButtons] = useState(true);
	type jumpParam = null | number | string;
	const [jumpingForwardAmount, setJumpingForwardAmount] =
		useState<jumpParam>(null);
	const [jumpingBackAmount, setJumpingBackAmount] = useState<jumpParam>(null);
	const [isSavingSingle, setIsSavingSingle] = useState(false);
	const alertRef: any = useRef(null);

	/*// #===============  PAGE FUNCTIONS   =============   */

	function changePlayerSrc({ vid, bookToUse }: changePlayerSrcParams) {
		const plyr = vidJsPlayer;
		plyr?.pause();
		changeVid({ chapNum: vid.chapter, bookToUse });
		const httpsOnly = vid.sources.filter((srcObj) =>
			srcObj.src.startsWith("https"),
		);
		const savedSrc = vid.savedSources?.video && {
			src: `${vid.savedSources?.video}`,
			type: "video/mp4",
		};
		const savedPoster = vid.savedSources?.poster;

		savedSrc ? plyr?.src(savedSrc) : plyr?.src(httpsOnly);
		savedPoster
			? plyr?.poster(savedPoster)
			: vid.poster
				? plyr?.poster(vid.poster)
				: null;
		plyr?.one("loadedmetadata", () => {
			handleChapters(vid, plyr);
		});
	}

	function changeVid({ chapNum, bookToUse }: changeVidParams) {
		const book = bookToUse || currentBook;
		if (!chapNum || !book) return;
		const newVid = book.find((vid) => vid.chapter === chapNum);
		if (!newVid) return;
		// Basically anything watching newVid needs to rerender.   Ran into some issues with some stale closures (I think) in callbacks and event listeners with video js
		const newVidReference = JSON.parse(JSON.stringify(newVid));
		if (newVid) {
			setCurrentVid(() => newVidReference);
		}
		if (vidJsPlayer) {
			vidJsPlayer.currentTime(0);
		}
	}

	async function handleChapters(
		vid: IVidWithCustom,
		vidJsPlayer: IvidJsPlayer | undefined,
		cleanUpUiMarkers = true,
	) {
		if (!vidJsPlayer) return;
		const chapters = await getChaptersArrFromVtt(vid, cleanUpUiMarkers);
		if (chapters) {
			setCurrentVid((vid) => {
				vid.chapterMarkers = chapters;
				return vid;
			});
		} else {
			setCurrentVid((vid) => {
				// intentionally and empty arr and not undefined
				vid.chapterMarkers = [];
				return vid;
			});
		}
		const allMarkersHaveValidXPos = chapters?.every((chap) => {
			return (
				chap.xPos?.toLowerCase() !== "nan" && typeof chap.xPos === "string"
			);
		});
		if (!allMarkersHaveValidXPos) {
			setCurrentVid((vid) => {
				// intentionally set to undefined now that we realize something is corrupt.  Will fetch chapter markers new if needed next time video is loaded
				vid.chapterMarkers = undefined;
				return vid;
			});
		}
		// Protect against some data corruption:
		if (chapters && allMarkersHaveValidXPos) {
			distributeChapterMarkers(chapters, vidJsPlayer);
		}
		return chapters;
	}

	async function setNewBook(vids: IVidWithCustom[]) {
		const bookName = vids[0].book;
		// treat the fs as source of truth since it's getting saved to in various places
		const mostRecentData = await getCurrentPlaylistDataFs(
			playlistInfo.playlist,
		);
		if (!mostRecentData) return;
		const matchingSetVids =
			mostRecentData && bookName
				? mostRecentData.formattedVideos[bookName]
				: vids;
		const firstBook = matchingSetVids[0];
		setCurrentBook(() => vids);
		changePlayerSrc({ vid: firstBook, bookToUse: vids });
	}

	async function fetchAndSetup() {
		try {
			const data = await fetchBcData(playlistInfo.playlist);
			// Put into state setter here;
			if (!data) {
				throw new Error("fetching failed");
			}

			const vids = data.videos as IVidWithCustom[];
			const { formattedVideos, ...restPlaylistData } = data;
			doInitialSetup(vids, formattedVideos, restPlaylistData);
		} catch (error) {
			console.error(error);
			const loading = document.querySelector("ion-loading");
			if (loading) {
				loading.remove();
			}
			if (alertRef.current) {
				alertRef.current.message = t("errorOccured");
				alertRef.current.header = t("error");
				alertRef.current.isOpen = true;
			}
		}
	}
	function getCurVid() {
		return currentVid;
	}
	function autoPlayToNextBook() {
		const player = vidJsPlayer;
		if (!player || !shapedPlaylist) return;

		const nextVid = currentBook.find(
			(b) => Number(b.chapter) === Number(getCurVid().chapter) + 1,
		);
		const allChapters = currentBook.map((vid) => Number(vid.chapter));
		const isLastChapter =
			Math.max(...allChapters) === Number(getCurVid().chapter);
		if (nextVid) {
			player.currentTime(0);
			changePlayerSrc({
				vid: nextVid,
				bookToUse: currentBook,
			});
		} else if (isLastChapter) {
			if (!currentVid.book) return;
			const keys = Object.keys(shapedPlaylist?.formattedVideos);
			const keyIdx = keys.indexOf(currentVid.book);
			const nextKey = keys[keyIdx + 1];
			// E.g From one book to next
			if (nextKey && shapedPlaylist?.formattedVideos[nextKey]) {
				const nextBook = shapedPlaylist?.formattedVideos[nextKey];
				setNewBook(nextBook);
			} else {
				// Noop: If there isn't a next vid or book, we should be at Rev 22
			}
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: <autoplay has a dep on the currentVid, and if we only hook this up using "on" it creates a stale closure on the state variables>
	useEffect(() => {
		if (vidJsPlayer) {
			// Using one each time a vid ends to try to avoid a stale closures issue that has cropped up some with react and videos js
			vidJsPlayer.off("ended", autoPlayToNextBook);
			vidJsPlayer.one("ended", autoPlayToNextBook);
		}
	}, [currentVid, vidJsPlayer]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <I'm purposely running this effect only on playlist cause the src we'll only shift from blob to https if the shapedPlaylist that is saved to fs is edited.  The fs version of the shapedPlaylist is the real source of truth for what the UI should show more than the state is>
	useEffect(() => {
		async function refreshPlayer() {
			if (vidJsPlayer) {
				// make sure the srces haven't been deleted out from under us. Given the props given
				changePlayerSrc({ vid: currentVid, bookToUse: currentBook });
			}
		}
		refreshPlayer();
	}, [shapedPlaylist]);

	async function doInitialSetup(
		vids: IVidWithCustom[],
		alreadyBucketizedData: formattedPlaylist | undefined,
		restPlaylistData: Omit<IPlaylistResponse, "videos" | "formattedVideos">,
	) {
		const alreadySavedState = await Preferences.get({
			key: "appState",
		});
		const stringifiedValue = alreadySavedState.value;

		let parsedState: IappState | null = stringifiedValue
			? JSON.parse(stringifiedValue)
			: null;
		if (
			!parsedState ||
			!parsedState?.currentBookName ||
			!parsedState?.currentVidId
		) {
			parsedState = null;
		}

		//=============== SORT INTO BOOKS IN CANONICAL ORDER  =============
		let bucketToUse: formattedPlaylist;
		if (alreadyBucketizedData) {
			bucketToUse = alreadyBucketizedData;
		} else {
			const { sortedVids, filteredByMatchingReferenceId } =
				massageVidsArray(vids);
			bucketToUse = groupObjectsByKey<IVidWithCustom, "book">(
				sortedVids,
				"book",
			);
			if (filteredByMatchingReferenceId.notMatching?.length) {
				bucketToUse.other = filteredByMatchingReferenceId.notMatching;
			}
		}

		const keys = Object.keys(bucketToUse);
		let firstBookShow: IVidWithCustom[] = bucketToUse[keys[0]]; //default
		if (parsedState?.currentBookName) {
			const key = parsedState?.currentBookName;
			if (key) {
				firstBookShow = bucketToUse[key];
			}
		}
		let firstVid = firstBookShow[0];
		if (parsedState?.currentVidId) {
			const fsVid = firstBookShow.find(
				(vid) => vid.id === parsedState?.currentVidId,
			);
			if (fsVid) {
				firstVid = fsVid;
			}
		}
		const shapedPlaylist = {
			formattedVideos: bucketToUse,
			...restPlaylistData,
		};

		setCurrentBook(() => firstBookShow);
		setCurrentVid(() => firstVid);
		setShapedPlaylist(shapedPlaylist);
		setIsFetching(false);

		await cacheBcPlaylistJson({
			data: JSON.stringify({
				formattedVideos: bucketToUse,
				...restPlaylistData,
			}),
			playlistSlug: playlistInfo.playlist,
		});
	}

	async function updateCachedStateDuringProgress() {
		if (vidJsPlayer && currentBook && currentVid) {
			const currentTime = vidJsPlayer.currentTime();
			const currentAppState = await getSavedAppPreferences();
			const stateToSave: IappState = {
				currentTime: currentTime,
				currentBookName: currentVid.book,
				currentVidId: currentVid.id,
			};
			const newAppPrefs = {
				...currentAppState,
				...stateToSave,
			};
			await updateSavedAppPreferences(newAppPrefs);
		}
	}

	function singleVideoDownloadControls() {
		const commonAction = (action: "DOWNLOAD" | "DELETE") => {
			const settingsEl = document.querySelector("#settingsRef");
			if (settingsEl) {
				const adjustPlayerSpeedEvent = new CustomEvent(
					"manageSingleVideoStorage",
					{
						detail: {
							video: currentVid,
							action: action,
						},
					},
				);
				settingsEl.dispatchEvent(adjustPlayerSpeedEvent);
				if (action === "DOWNLOAD") {
					setIsSavingSingle(true);
				}
			}
		};
		if (!currentVid.savedSources?.video) {
			return {
				text: t("downloadChapterNumber", {
					chapter: String(Number(currentVid.chapter)),
				}),
				action: () => commonAction("DOWNLOAD"),
			};
		}

		return {
			text: t("deleteChapterNumber", {
				chapter: String(Number(currentVid.chapter)),
			}),
			action: () => commonAction("DELETE"),
		};
	}

	/*// #=============== END PAGE FUNCTIONS   =============   */

	useIonViewWillEnter(() => {
		fetchAndSetup();
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <biome not aware enough of code deps here to say>
	useEffect(() => {
		updateCachedStateDuringProgress();
	}, [currentVid, currentBook]);

	useEffect(() => {
		if (currentVid.savedSources?.video) {
			setIsSavingSingle(false);
		}
	}, [currentVid.savedSources?.video]);

	/*//# ===============  MARKUP   =============   */
	return (
		<IonPage id="">
			<IonHeader className=" bg-base">
				<IonToolbar>
					<div className="flex content-center items-center justify-between w-full px-2.5">
						<a href="/">
							<ArrowBack />
						</a>
						<span className="w-44 block mx-auto">
							<a href="/">
								<DotLogo />
							</a>
						</span>
						{shapedPlaylist && (
							<Settings
								setCurrentVid={setCurrentVid}
								player={vidJsPlayer}
								playlistData={shapedPlaylist}
								currentBook={currentBook}
								currentVid={currentVid}
								playlistSlug={playlistInfo.playlist}
								setShapedPlaylist={setShapedPlaylist}
								setCurrentBook={setCurrentBook}
							/>
						)}
					</div>
				</IonToolbar>
			</IonHeader>

			<IonContent fullscreen>
				<IonAlert
					ref={alertRef}
					header={t("errorOccurred")}
					buttons={["Ok"]}
					onDidDismiss={() => {
						alertRef.current.isOpen = false;
					}}
				/>
				<IonLoading message={t("loading")} isOpen={isFetching} />

				<div>
					<div className="overflow-x-hidden max-w-[1400px] mx-auto w-full ">
						{shapedPlaylist?.formattedVideos && (
							<div
								data-testid="stateChecker"
								data-currentbook={currentVid.book}
								data-currentchap={currentVid.chapter}
								className="lg:grid lg:grid-cols-[70%_30%] h-90vh"
							>
								{/* player parts */}
								<div className="aspect-video lg:aspect-ratio-initial">
									<div className="w-full mx-auto   relative  sm:overflow-hidden h-full">
										<VerseSegmentJump
											currentVideo={currentVid}
											player={vidJsPlayer}
											dir="back"
										/>
										{jumpingBackAmount && (
											<JumpDisplay
												dir="back"
												id="seekRippleBackward"
												text={String(jumpingBackAmount)}
											/>
										)}
										<VidJsPlayer
											handleChapters={handleChapters}
											setJumpingBackAmount={setJumpingBackAmount}
											setJumpingForwardAmount={setJumpingForwardAmount}
											setPlayer={setVidJsPlayer}
											existingPlayer={vidJsPlayer}
											playlistData={shapedPlaylist.formattedVideos}
											currentVid={currentVid}
										/>
										{jumpingForwardAmount && (
											<JumpDisplay
												dir="forward"
												id="seekRippleForward"
												text={String(jumpingForwardAmount)}
											/>
										)}
										<VerseSegmentJump
											currentVideo={currentVid}
											player={vidJsPlayer}
											dir="forward"
										/>
									</div>
									{/* end player parts */}
								</div>
								{/* end player parts */}

								{/* All parts but video player */}
								<div className="lg:(h-[90vh] flex flex-col)">
									<div className="mt-4 flex justify-between px-5 gap-2">
										<PlaylistInfo
											currentVid={currentVid}
											playlist={playlistInfo.playlist}
											isSavingSingle={isSavingSingle}
										/>
										<div data-name="downloadSingleBtn">
											<IonButton
												id=""
												size="small"
												fill="outline"
												color="primary"
												className="text-surface"
												onClick={() => {
													singleVideoDownloadControls().action();
												}}
												style={{
													"--border-width": "1px",
													"--border-radius": "0px",
													"--padding-start": ".625rem",
													"--padding-end": ".625rem",
													"--padding-bottom": ".625rem",
													"--padding-top": ".625rem",
												}}
											>
												{singleVideoDownloadControls().text}
											</IonButton>
										</div>
									</div>

									<div className="px-5">
										{currentBook && (
											<ChapterSelector
												showChapSliderButtons={showChapSliderButtons}
												chapterButtonOnClick={(vid: IVidWithCustom) => {
													changePlayerSrc({
														vid,
													});
												}}
												currentVid={currentVid}
												currentBook={currentBook}
											/>
										)}
									</div>

									<PlaylistBookPicker
										vids={shapedPlaylist.formattedVideos}
										setShowChapSliderButtons={setShowChapSliderButtons}
										setNewBook={setNewBook}
									/>
								</div>
								{/*  All parts but the video player */}
							</div>
						)}
					</div>
				</div>
			</IonContent>
		</IonPage>
	);
}

export default Playlist;
