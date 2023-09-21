import {useRef} from "react";
import {
  IconMaterialSymbolsChevronLeft,
  IconMaterialSymbolsChevronRight,
} from "./Icons";
import {ChapterList} from "./ChapterList";
import {IVidWithCustom} from "../customTypes/types";

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
    <div className="flex">
      {showChapSliderButtons && (
        <button
          className="pr-3 text-2xl"
          onClick={() => {
            const chapterBtnTrack = document.querySelector(
              '[data-js="chapterButtonTrack"]'
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
          className="pl-3 text-2xl"
          onClick={() => {
            const chapterBtnTrack = document.querySelector(
              '[data-js="chapterButtonTrack"]'
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
