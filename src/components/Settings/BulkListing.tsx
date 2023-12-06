import { CheckboxCustomEvent, IonButton, IonCheckbox } from "@ionic/react";
import { Dispatch, SetStateAction, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	IPlaylistData,
	IVidWithCustom,
	validPlaylistSlugs,
	vidInProgressInfo,
} from "../../customTypes/types";
import { downloadProgressInfo } from "../../customTypes/types";
import {
	getCurrentPlaylistDataFs,
	getDownloadSize,
	updateStateFromFs,
} from "../../lib/Ui";
import { makeVidSaver } from "../../lib/storage";
import { groupArrayIntoSubarrays, truncateString } from "../../lib/utils";
import { IconMaterialSymbolsCheckCircle } from "../Icons";
type IDownloadListing = {
	currentBook: IVidWithCustom[];
	currentVid: IVidWithCustom;
	playlistData: IPlaylistData;
	playlistSlug: validPlaylistSlugs;
	setDownloadProgress: (
		value: SetStateAction<
			| {
					started: boolean;
					amount: number;
					vidName: string;
			  }
			| undefined
		>,
	) => void;
	saveVidOffline(
		vidToSave?: IVidWithCustom,
		playlistData?: IPlaylistData,
	): Promise<void>;
	setCurrentBook: Dispatch<SetStateAction<IVidWithCustom[]>>;
	setCurrentVid: Dispatch<SetStateAction<IVidWithCustom>>;
	downloadProgress: downloadProgressInfo | undefined;
	setShapedPlaylist: Dispatch<SetStateAction<IPlaylistData | undefined>>;
};
export function BulkListing({
	playlistData,
	playlistSlug,
	setDownloadProgress,
	saveVidOffline,
	setCurrentBook,
	setCurrentVid,
	currentVid,
	downloadProgress,
	setShapedPlaylist,
}: IDownloadListing) {
	const { t } = useTranslation();
	const [booksSelected, setBooksSelected] = useState<Array<IVidWithCustom[]>>();
	function allBooks() {
		const allVals = Object.values(playlistData.formattedVideos).map((value) => {
			const bookName = truncateString({
				inputString: value[0].custom_fields.localized_book_name,
				maxLength: 8,
			});

			return {
				bookName,
				value,
				isAlreadySaved: value.every((vid) => !!vid.savedSources),
				size: getDownloadSize({
					scope: value,
					playlistSlug,
					maxSigDigits: 2,
					includeAlreadySavedSourcesInCalc: true,
				}),
			};
		});
		const chunkedCols = groupArrayIntoSubarrays(allVals, 9);
		return chunkedCols;
	}
	function handleChecked(e: CheckboxCustomEvent, videos: IVidWithCustom[]) {
		const isChecked = e.target.checked;

		if (isChecked) {
			setBooksSelected((prev) => {
				if (prev) {
					const newState = [...prev, videos];
					return newState;
				}
				return [videos];
			});
		} else {
			if (booksSelected) {
				const without = booksSelected.filter(
					(bookArr) => bookArr[0].book !== videos[0].book,
				);
				setBooksSelected(without);
			}
		}
	}

	async function downloadSelectedBooks() {
		if (!booksSelected) return;
		// Yes this loop is serial, but assuming poor internet taht might be interrupted and doing these as background tasks, I think it preferable to try to make sure each one gets completed when we are talking about downloading 50+ mb resources.
		for await (const book of booksSelected) {
			for await (const vidChapter of book) {
				if (
					!vidChapter.savedSources?.poster ||
					!vidChapter.savedSources?.video
				) {
					setDownloadProgress({
						amount: 0,
						started: true,
						vidName:
							vidChapter.name ||
							vidChapter.reference_id ||
							vidChapter.id ||
							"Unnamed Vid",
					});
					const currentPlaylistData =
						await getCurrentPlaylistDataFs(playlistSlug);
					await saveVidOffline(vidChapter, currentPlaylistData);
				}
			}
		}

		setTimeout(() => {
			setDownloadProgress({
				amount: 0,
				started: false,
				vidName: currentVid.name || currentVid.reference_id || "unknown video",
			});
		}, 1000);
	}
	async function deleteSelectedBooks() {
		if (!booksSelected) return;
		for await (const book of booksSelected) {
			for await (const vidChapter of book) {
				console.log(`deleting ${vidChapter.reference_id}`);
				const vidSaver = makeVidSaver(playlistSlug, vidChapter);
				const currentPlaylistData =
					await getCurrentPlaylistDataFs(playlistSlug);
				if (currentPlaylistData) {
					await vidSaver.deleteAllVidData(currentPlaylistData, vidChapter);
				}
			}
		}
		await updateStateFromFs({
			playlistSlug,
			vid: currentVid,
			setCurrentBook,
			setShapedPlaylist: setShapedPlaylist,
			setCurrentVid: setCurrentVid,
		});
	}
	function determineShowBulkButtons() {
		return booksSelected?.length;
	}

	return (
		<div className="mt-4">
			<ul className="flex gap-4">
				{allBooks().map((col, idx) => (
					// biome-ignore lint: array index is fine for a key here.  There is no reordering appening
					<ul key={idx}>
						{col.map((book) => (
							<li key={book.bookName} className="mb-2 ">
								<IonCheckbox
									onIonChange={(e) => {
										handleChecked(e, book.value);
									}}
									labelPlacement="end"
								>
									{book.bookName}{" "}
									<span className="text-xs flex content-center gap-1">
										{book.size}

										{book.isAlreadySaved && (
											<span className="w-4 inline-block">
												<IconMaterialSymbolsCheckCircle className="text-green-800 w-full h-full" />
											</span>
										)}
									</span>
								</IonCheckbox>
							</li>
						))}
					</ul>
				))}
			</ul>
			{determineShowBulkButtons() ? (
				<div className="flex gap-4">
					<IonButton
						size="small"
						fill="outline"
						className="p-0 m-0"
						onClick={(e) => downloadSelectedBooks()}
						disabled={downloadProgress?.started}
					>
						{t(
							downloadProgress?.started
								? "downloadInProgress"
								: "downloadSelected",
						)}
						<br />
					</IonButton>
					<IonButton
						size="small"
						fill="outline"
						className="p-0 m-0"
						onClick={(e) => deleteSelectedBooks()}
						disabled={downloadProgress?.started}
					>
						{t("deleteSelected")}
						<br />
					</IonButton>
				</div>
			) : null}
		</div>
	);
}
