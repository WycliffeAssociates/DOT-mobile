import type { IVidWithCustom } from "../customTypes/types";

interface IChapterButton {
	onClick: (vid: IVidWithCustom) => void;
	vid: IVidWithCustom;
	currentVid: IVidWithCustom;
}
export function ChapterButton(props: IChapterButton) {
	return (
		<button
			onClick={() => {
				props.onClick(props.vid);
				// updateHistory(props.vid, "PUSH");
			}}
			type="button"
			className={`rounded-full h-8 w-8 inline-grid place-content-center text-center flex-shrink-0 bg-neutral-400  text-white sm:(w-12 h-12) hover:(bg-primary/70 transition scale-110) active:(scale-95) ${
				props.vid.chapter === props.currentVid.chapter
					? "bg-neutral-800 transform scale-120  transition-colors duration-200"
					: ""
			}`}
		>
			{Number(props.vid.chapter)}
		</button>
	);
}
