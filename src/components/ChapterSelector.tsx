import { useRef } from "react";
import type { IVidWithCustom } from "../customTypes/types";
import { ChapterList } from "./ChapterList";
import {
	IconMaterialSymbolsChevronLeft,
	IconMaterialSymbolsChevronRight,
} from "./Icons";

type IChapterSelector = {
	showChapSliderButtons: boolean;
	chapterButtonOnClick: (vid: IVidWithCustom) => void;
	currentVid: IVidWithCustom;
	currentBook: IVidWithCustom[];
};
export function ChapterSelector({
	showChapSliderButtons,
	chapterButtonOnClick,
	currentVid,
	currentBook,
}: IChapterSelector) {
	const chaptersContainerRef = useRef(null);
	return (
		<div className="flex gap-2">
			{showChapSliderButtons && (
				<button
					type="button"
					className="text-2xl"
					onClick={() => {
						const chapterBtnTrack = document.querySelector(
							'[data-js="chapterButtonTrack"]',
						) as HTMLUListElement;
						if (chapterBtnTrack) {
							chapterBtnTrack.scrollLeft -= chapterBtnTrack.clientWidth;
						}
					}}
				>
					<IconMaterialSymbolsChevronLeft />
				</button>
			)}

			<div
				className="overflow-x-auto scrollbar-hide flex w-full"
				data-js="chaptersNav"
				ref={chaptersContainerRef}
			>
				<ChapterList
					showChapSliderButtons={showChapSliderButtons}
					chapterButtonOnClick={(vid: IVidWithCustom) => {
						chapterButtonOnClick(vid);
					}}
					currentVid={currentVid}
					currentBook={currentBook}
				/>
			</div>

			{showChapSliderButtons && (
				<button
					type="button"
					className="text-2xl"
					onClick={() => {
						const chapterBtnTrack = document.querySelector(
							'[data-js="chapterButtonTrack"]',
						) as HTMLUListElement;
						if (chapterBtnTrack) {
							chapterBtnTrack.scrollLeft += chapterBtnTrack.clientWidth;
						}
					}}
				>
					<IconMaterialSymbolsChevronRight />
				</button>
			)}
		</div>
	);
}
