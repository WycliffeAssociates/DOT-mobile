import type { CheckboxCustomEvent } from "@ionic/core";
import { IonButton, IonCheckbox, IonProgressBar } from "@ionic/react";
import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import type {
	downloadProgressInfo,
	IVidWithCustom,
} from "../../customTypes/types";
import { IconCancelX, IconMaterialSymbolsCheckCircle } from "../Icons";

type BookToDownloadProps = {
	book: {
		bookName: string | undefined;
		value: IVidWithCustom[];
		isAlreadySaved: boolean;
		size: string;
	};
	handleChecked(
		e: CheckboxCustomEvent,
		videos: IVidWithCustom[],
		bookName: string,
	): void;
	downloadProgress: downloadProgressInfo | undefined;
	bookNamesSelected: string[];
	booksToCancel: (string | undefined)[];
	setBooksToCancel: Dispatch<SetStateAction<(string | undefined)[]>>;
	clearBookFromFs(videos: IVidWithCustom[]): void;
	setIsSavingSingle: Dispatch<SetStateAction<string[]>>;
};
function bookIsFullyDownloaded(book: IVidWithCustom[]) {
	return book.every((vid) => !!vid.savedSources?.video);
}
export function BookToDownload(props: BookToDownloadProps) {
	const { t } = useTranslation();
	const { book } = props;
	const bookName = book.bookName;

	const numerator = book.value.filter((vid) => {
		return vid?.savedSources?.video;
	}).length;
	const denom = book.value.length;

	function downloadInProgressIsInThisBook() {
		if (
			!bookName ||
			!props.downloadProgress ||
			props.downloadProgress?.started === false
		) {
			return false;
		}

		const vidIsInThisBook = props.book.value.some((vid) => {
			return vid.id === props.downloadProgress?.vidId;
		});

		if (vidIsInThisBook) return true;
		return false;
	}
	function statusText() {
		if (!bookName || !props.downloadProgress) return "";
		const dpName = props.downloadProgress?.vidName.toLowerCase();
		const chapInProgress = props.downloadProgress?.vidName?.match(/\d+$/);
		const chapNum = chapInProgress ? chapInProgress[0] : "";

		if (dpName?.includes(bookName?.toLowerCase())) {
			return t("downloadingChapterNum", {
				chapter: chapNum,
			});
		}
	}
	function getCurrentProgress() {
		return props.downloadProgress?.amount || 0;
	}
	function isChecked() {
		return props.bookNamesSelected.includes(bookName || "");
	}
	return (
		<li
			key={book.bookName}
			className="py-4 border-b border-b-[#D9D9D9] flex justify-between  gap-3"
		>
			<div className="">
				<IonCheckbox
					color="dark"
					onIonChange={(e) => {
						props.handleChecked(e, book.value, bookName || "");
					}}
					checked={isChecked()}
					labelPlacement="end"
					disabled={bookIsFullyDownloaded(book.value)}
				>
					<span className="flex gap-1">
						{book.bookName}{" "}
						{book.isAlreadySaved && (
							<span className="w-4 inline-block">
								<IconMaterialSymbolsCheckCircle className="text-[#339E35] w-full h-full" />
							</span>
						)}
					</span>
					<span className="text-xs flex content-center gap-1">{book.size}</span>
				</IonCheckbox>
			</div>

			{book.isAlreadySaved ? (
				<IonButton
					id=""
					size="small"
					fill="outline"
					color="primary"
					className="text-surface"
					onClick={() => {
						props.clearBookFromFs(book.value);
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
					{t("remove")}
				</IonButton>
			) : (
				downloadInProgressIsInThisBook() && (
					<div className="w-full max-w-400px flex gap-3 items-center justify-end">
						<div className="flex-col  w-1/2 mt-2">
							<IonProgressBar
								className="h-2 rounded-full w-full"
								value={getCurrentProgress()}
								buffer={1}
								style={{
									background: "#FDE0D0",
								}}
							/>
							<span className="text-[.6rem] leading-3">{statusText()}</span>
						</div>
						<div className="flex flex-col">
							<span className="text-sm">
								{new Intl.NumberFormat(navigator.languages[0], {
									style: "percent",
									maximumFractionDigits: 0,
								}).format(props.downloadProgress?.amount || 0)}
							</span>
							<span className="block text-[.6rem] text-center">
								{String(numerator)} &frasl; {String(denom)}
							</span>
						</div>

						<button
							type="button"
							onClick={() => {
								const vidsWithIds = book.value
									.filter((v) => !!v.id)
									.map((v) => v.id) as string[];
								props.setIsSavingSingle((prev) =>
									prev.filter((id) => !vidsWithIds.includes(id)),
								);
								if (
									window.dotAppBooksToCancel &&
									Array.isArray(window.dotAppBooksToCancel) &&
									bookName
								) {
									window.dotAppBooksToCancel = [
										...window.dotAppBooksToCancel,
										...vidsWithIds,
									];
								} else if (bookName) {
									window.dotAppBooksToCancel = vidsWithIds;
								}
							}}
						>
							<IconCancelX className="text-dark active:text-red-400 hover:text-red-400" />
						</button>
					</div>
				)
			)}
		</li>
	);
}
