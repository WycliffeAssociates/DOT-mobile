import type { IVidWithCustom } from "../customTypes/types";
import { ChapterButton } from "./ChapterButton";

interface IChapterList {
	chapterButtonOnClick: (arg: IVidWithCustom) => void;
	currentVid: IVidWithCustom;
	currentBook: any[];
	showChapSliderButtons: boolean;
}
export function ChapterList({
	currentBook,
	chapterButtonOnClick,
	currentVid,
}: IChapterList) {
	return (
		<ul
			data-js="chapterButtonTrack"
			data-testid="chapterSelector"
			className={
				"flex flex-nowrap gap-2.5 items-start content-start px-2 py-4 overflow-x-auto scrollbar-hide  list-none scroll-smooth motion-reduce:scroll-auto w-full"
			}
		>
			{currentBook.map((vid) => {
				return (
					<li key={vid.id}>
						<ChapterButton
							currentVid={currentVid}
							vid={vid}
							onClick={(vid) => chapterButtonOnClick(vid)}
						/>
					</li>
				);
			})}
		</ul>
	);
}
