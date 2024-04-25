import { useEffect, useState } from "react";

import type {
	IVidWithCustom,
	IadjacentChap,
	IvidJsPlayer,
} from "../customTypes/types";
import { trackAdjacentChap } from "../lib/Ui";
import { IconChapBack, IconChapNext } from "./Icons";
type IVerseSegmentJump = {
	player: IvidJsPlayer | undefined;
	currentVideo: IVidWithCustom;
	dir: "back" | "forward";
};
export function VerseSegmentJump(props: IVerseSegmentJump) {
	const [adjacentChaps, setAdjacentChaps] = useState<{
		next: IadjacentChap;
		prev: IadjacentChap;
	}>();
	const [curTime, setCurTime] = useState(0);

	function adjacentTrack() {
		if (!props.player) return;
		if (curTime > 0) {
			const { prev, next } = trackAdjacentChap(
				props.currentVideo,
				props.player,
			);
			setAdjacentChaps({ next, prev });
		}
	}
	// biome-ignore lint/correctness/useExhaustiveDependencies: <I do only want to run this effect on these two things changing>
	useEffect(() => {
		adjacentTrack();
	}, [curTime, props.currentVideo]);

	function hideChapBtn(dir: "prev" | "next") {
		if (!adjacentChaps) return "hidden";
		if (dir === "prev" && !adjacentChaps.prev) {
			return "hidden!";
		}
		if (dir === "next" && !adjacentChaps.next) {
			return "hidden!";
		}
		return "";
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: <Pretty sure these are the only deps I want to run effect on>
	useEffect(() => {
		if (props.player) {
			// These is slightly convoluted to have to use a local state variable, but the player.off or remove event listener isn't working like I'd expect, "once" as event listener doesn't work bc we need continual updates, and if you don't remove the event listener, you end up with duplicate listeners using conflicting or stale values.  This way we can just let the effect above run based on the current time, and then it's getting fresh props on rerender of the state var instead of any stale values captured in the event listener
			props.player.on("timeupdate", () => {
				if (!props.player) return;
				const currentTime = props.player.currentTime();
				setCurTime(currentTime);
			});
		}
	}, [props.player, props.currentVideo]);

	if (!props.player) return null;

	if (props.dir === "back") {
		return (
			<span
				className={`flex flex-col absolute left-2 top-10  z-30 font-bold items-center text-primary/70 ${hideChapBtn(
					"prev",
				)}`}
			>
				<button
					type="button"
					data-title="chapBack"
					className={
						"text-surface w-12 h-12 md:w-20 md:h-20 bg-gray-200/40 grid place-content-center rounded-full hover:( text-primary bg-primary/10)"
					}
					onClick={() => {
						if (props.player && adjacentChaps?.prev?.chapterStart) {
							props.player.currentTime(adjacentChaps?.prev.chapterStart);
						}
					}}
				>
					<IconChapBack />
				</button>
				<span className="w-26 text-xs  text-center text-white/90">
					{adjacentChaps?.prev?.label}
				</span>
			</span>
		);
	}
	return (
		<span
			className={`flex flex-col absolute right-2 top-10  z-30 font-bold items-center ${hideChapBtn(
				"next",
			)}`}
		>
			<button
				type="button"
				data-title="chapNext"
				className={
					"text-surface w-12 h-12 md:w-20 md:h-20 bg-gray-200/40 grid place-content-center rounded-full hover:( text-primary bg-primary/10) "
				}
				onClick={() => {
					if (props.player && adjacentChaps?.next?.chapterStart) {
						props.player.currentTime(adjacentChaps?.next.chapterStart);
					}
				}}
			>
				<IconChapNext />
			</button>
			<span className="w-26 text-xs  text-center text-white/90 bg-blend-difference	">
				{adjacentChaps?.next?.label}
			</span>
		</span>
	);
}
