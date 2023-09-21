import {useTranslation} from "react-i18next";
import {IVidWithCustom} from "../customTypes/types";
import {Dispatch, SetStateAction} from "react";
import {manageShowingChapterArrows} from "../lib/Ui";
import {normalizeBookName} from "../lib/utils";

type IPlaylistBookPicker = {
  vids: Record<string, IVidWithCustom[]>;
  setNewBook: (vids: IVidWithCustom[]) => Promise<void>;
  setShowChapSliderButtons: Dispatch<SetStateAction<boolean>>;
  currentVid: IVidWithCustom;
};
export function PlaylistBookPicker({
  vids,
  setNewBook,
  setShowChapSliderButtons,
  currentVid,
}: IPlaylistBookPicker) {
  const {t, i18n} = useTranslation();

  return (
    <div
      data-title="BookNav"
      className={`px-3 py-2 bg-primary dark:bg-surface/05 text-base rounded-tr-xl rounded-tl-xl  scrollbar-hide min-h-200px`}
    >
      <h2 className="text-white dark:text-neutral-200 font-bold">
        {t("bibleSelection")}
      </h2>
      <p className="text-white dark:text-neutral-200">{t("chooseBook")}</p>
      <div className="relative h-full sm:h-auto ">
        <div
          style={{
            position: "absolute",
            inset: "0",
            pointerEvents: "none",
            height: "100%",
          }}
          className="y-scroll-gradient sm:(hidden)"
        />
        <ul className="max-h-375px overflow-y-auto scrollbar-hide pt-8 pb-36 sm:(max-h-[50vh]) list-none">
          {Object.entries(vids).map(([key, book], idx) => {
            return (
              <li
                key={key}
                className="text-neutral-100 dark:text-neutral-200 py-1 w-full border-y border-base md:text-lg md:py-2"
              >
                <button
                  onClick={async () => {
                    await setNewBook(book);
                    // updateHistory(book[0], "PUSH");

                    // see if need to resize buttons track

                    setTimeout(() => {
                      const refNode = document.querySelector(
                        "[data-js='chaptersNav']"
                      );
                      const boundingClient = refNode?.getBoundingClientRect();
                      manageShowingChapterArrows(
                        boundingClient,
                        setShowChapSliderButtons
                      );
                    }, 1);
                  }}
                  className={`inline-flex gap-2 items-center hover:(text-surface font-bold underline) ${
                    currentVid.custom_fields?.book?.toUpperCase() ===
                    key.toUpperCase()
                      ? "underline font-bold"
                      : ""
                  }`}
                >
                  <span className="bg-base text-primary dark:text-primary rounded-full p-4 h-0 w-0 inline-grid place-content-center">
                    {idx + 1}
                  </span>
                  {normalizeBookName(
                    book.find((b) => !!b.localizedBookName)
                      ?.localizedBookName || key
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
