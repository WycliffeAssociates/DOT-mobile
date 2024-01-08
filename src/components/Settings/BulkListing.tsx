import { CheckboxCustomEvent, IonButton } from "@ionic/react";
import { Dispatch, SetStateAction, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	IPlaylistData,
	IVidWithCustom,
	validPlaylistSlugs,
} from "../../customTypes/types";
import { downloadProgressInfo } from "../../customTypes/types";
import {
	getCurrentPlaylistDataFs,
	getDownloadSize,
	updateStateFromFs,
} from "../../lib/Ui";
import { makeVidSaver } from "../../lib/storage";
import { BookToDownload } from "./DownloadBookItem";
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
					vidId: string;
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
	const [bookNamesSelected, setBookNamesSelected] = useState<string[]>([]);
	const [booksToCancel, setBooksToCancel] = useState<Array<string | undefined>>(
		[],
	);

	function allBooks() {
		const allVals = Object.values(playlistData.formattedVideos).map((value) => {
			return {
				bookName: value[0].custom_fields.localized_book_name,
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
		return allVals;
	}
	function handleChecked(
		e: CheckboxCustomEvent,
		videos: IVidWithCustom[],
		bookName: string,
	) {
		const isChecked = e.target.checked;
		if (isChecked) {
			setBooksSelected((prev) => {
				if (prev) {
					const newState = [...prev, videos];
					return newState;
				}
				return [videos];
			});
			setBookNamesSelected((prev) => {
				return [...prev, bookName];
			});
		} else {
			if (booksSelected) {
				const without = booksSelected.filter(
					(bookArr) => bookArr[0].book !== videos[0].book,
				);
				const withoutBookNames = bookNamesSelected.filter((bookN) => {
					return bookN !== bookName;
				});
				setBookNamesSelected(withoutBookNames);
				setBooksSelected(without);
			}
		}
	}
	function cancelButtonText() {
		if (window.dotAppStopAllDownloads) {
			return t("cancelling");
		}
		if (downloadProgress?.started) {
			return t("cancel");
		}
		if (booksSelected?.length && booksSelected?.length > 0) {
			return t("downloadNum", {
				number: booksSelected.length,
			});
		}
		return t("download");
	}

	function skipVidDownload(vidChapter: IVidWithCustom) {
		if (
			Array.isArray(window.dotAppBooksToCancel) &&
			vidChapter.id &&
			window.dotAppBooksToCancel.includes(vidChapter.id)
		) {
			return true;
		}
		if (window.dotAppStopAllDownloads) return true;
	}

	async function downloadSelectedBooks() {
		if (!booksSelected) return;
		const flattenedBooks = booksSelected.flat();

		//  NOTE
		// Yes this loop is serial, but assuming poor internet taht might be interrupted and doing these as background tasks, I think it preferable to try to make sure each one gets completed when we are talking about downloading 50+ mb resources for each video. Parallelizing might just mean processing forever.

		for await (const vidChapter of flattenedBooks) {
			if (skipVidDownload(vidChapter)) continue;
			if (!vidChapter.savedSources?.poster || !vidChapter.savedSources?.video) {
				setDownloadProgress({
					amount: 0,
					started: true,
					vidName:
						vidChapter.name ||
						vidChapter.reference_id ||
						vidChapter.id ||
						"Unnamed Vid",
					vidId: vidChapter.id || "",
				});
				const currentPlaylistData =
					await getCurrentPlaylistDataFs(playlistSlug);
				await saveVidOffline(vidChapter, currentPlaylistData);
			}
		}

		setTimeout(() => {
			setDownloadProgress({
				amount: 0,
				started: false,
				vidName: currentVid.name || currentVid.reference_id || "unknown video",
				vidId: currentVid.id || "",
			});
			// reset selection when action is finished
			setBooksSelected(undefined);
			setBookNamesSelected([]);
		}, 1000);
		window.dotAppBooksToCancel = [];
		window.dotAppStopAllDownloads = false;
	}
	async function deleteSelectedBooks(books?: IVidWithCustom[][]) {
		const booksToUse = books ? books : booksSelected;
		if (!booksToUse) return;
		for await (const book of booksToUse) {
			for await (const vidChapter of book) {
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
		// reset selection when action is finished
		setBooksSelected(undefined);
		setBookNamesSelected([]);
	}

	function clearBookFromFs(videos: IVidWithCustom[]) {
		setBooksSelected((prev) => {
			if (prev) {
				const newState = [...prev, videos];
				return newState;
			}
			// A side cb
			deleteSelectedBooks([videos]);
			return [videos];
		});
	}

	return (
		<div className="mt-4 max-h-70vh overflow-y-auto scrollbar-hide relative bg-white ">
			<div className="sticky top-0 z-10 bg-white">
				<IonButton
					id=""
					size="small"
					fill="outline"
					color="primary"
					disabled={booksSelected?.length ? false : true}
					className="text-surface"
					onClick={() => {
						if (downloadProgress?.started) {
							window.dotAppStopAllDownloads = true;
						} else {
							downloadSelectedBooks();
						}
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
					{cancelButtonText()}
				</IonButton>
			</div>
			<ul className="gap-4">
				{allBooks().map((book) => (
					<BookToDownload
						book={book}
						handleChecked={handleChecked}
						key={book.bookName}
						downloadProgress={downloadProgress}
						bookNamesSelected={bookNamesSelected}
						booksToCancel={booksToCancel}
						setBooksToCancel={setBooksToCancel}
						clearBookFromFs={clearBookFromFs}
					/>
				))}
			</ul>
		</div>
	);
}
