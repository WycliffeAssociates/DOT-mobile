import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import type { IVidWithCustom } from "../customTypes/types";
import { manageShowingChapterArrows } from "../lib/Ui";
import { normalizeBookName } from "../lib/utils";
import { IconMaterialSymbolsCheckCircle } from "./Icons";

type IPlaylistBookPicker = {
	vids: Record<string, IVidWithCustom[]>;
	setNewBook: (vids: IVidWithCustom[]) => Promise<void>;
	setShowChapSliderButtons: Dispatch<SetStateAction<boolean>>;
};
export function PlaylistBookPicker({
	vids,
	setNewBook,
	setShowChapSliderButtons,
}: IPlaylistBookPicker) {
	const { t } = useTranslation();

	return (
		<div
			data-title="BookNav"
			className={
				"text-base scrollbar-hide min-h-200px lg:(h-full flex flex-col)"
			}
		>
			<div className="text-white bg-primary px-5 py-2">
				<h2 className="text-white   font-bold">{t("bibleSelection")}</h2>
				<p className="text-white text-xs ">{t("chooseBook")}</p>
			</div>
			<div className="relative h-full sm:h-auto px-5 lg:(overflow-auto)">
				<ul
					data-testid="booksAvailable"
					className="max-h-375px overflow-y-scroll scrollbar-hide  pb-36 sm:(max-h-[50vh]) list-none lg:(h-full max-h-unset)"
				>
					{Object.entries(vids).map(([key, book], idx) => {
						return (
							<li
								key={key}
								className="py-1 w-full border-b border-[#a1a1a1] md:text-lg md:py-2 text-lg flex justify-between"
							>
								<button
									type="button"
									onClick={async () => {
										await setNewBook(book);

										// a little hacky, but need the dom to finish painting to get the bounding box to decide decide whether the arrows are really needed or not based on intrincisic width of container with how many chapters there are
										setTimeout(() => {
											const refNode = document.querySelector(
												"[data-js='chaptersNav']",
											);
											const boundingClient = refNode?.getBoundingClientRect();
											manageShowingChapterArrows(
												boundingClient,
												setShowChapSliderButtons,
											);
										}, 1);
									}}
									className={
										"inline-flex gap-3 items-center hover:(text-surface font-bold underline) "
									}
								>
									<span className="bg-dark text-white  rounded-full p-4 text-sm h-0 w-0 inline-grid place-content-center">
										{idx + 1}
									</span>
									{normalizeBookName(
										book.find((b) => !!b.localizedBookName)
											?.localizedBookName || key,
									)}
								</button>
								{book.every((vid) => {
									return !!vid.savedSources?.video;
								}) && (
									<span className="w-6 inline-block ml-2">
										<IconMaterialSymbolsCheckCircle className="text-[#339E35] w-full h-full" />
									</span>
								)}
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}
