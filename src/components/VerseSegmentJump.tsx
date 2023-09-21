import {IconChapBack, IconChapNext} from "./Icons";
import {IVidWithCustom, IvidJsPlayer} from "../customTypes/types";
import {getAdjacentChap, jumpToNextChap, trackAdjacentChap} from "../lib/Ui";
import {useCallback, useEffect, useState} from "react";
import {VideoJsPlayer} from "video.js";
type IVerseSegmentJump = {
  player: IvidJsPlayer | undefined;
  currentVideo: IVidWithCustom;
  dir: "back" | "forward";
};
export function VerseSegmentJump(props: IVerseSegmentJump) {
  const [adjacentChaps, setAdjacentChaps] = useState<{next: any; prev: any}>();

  const adjacentTrack = useCallback((player: VideoJsPlayer) => {
    const {prev, next} = trackAdjacentChap(props.currentVideo, player);
    setAdjacentChaps({next, prev});
  }, []);

  useEffect(() => {
    if (props.player) {
      const plyr = props.player;
      // as we move through, show or don't show the verse segment jumps
      props.player.on("timeupdate", () => adjacentTrack(plyr));
    }
  }, [props.player]);

  if (!props.player) return null;

  if (props.dir == "back") {
    return (
      <button
        data-title="chapBack"
        className={`text-surface w-12 h-12 md:w-20 md:h-20 bg-gray-200/40 grid place-content-center rounded-full hover:( text-primary bg-primary/10) absolute left-4 top-1/2 -translate-y-1/2 z-30 ${
          !adjacentChaps?.prev && "hidden"
        }`}
        onClick={() => {
          if (props.player && adjacentChaps?.prev.chapterStart) {
            props.player.currentTime(adjacentChaps?.prev.chapterStart);
          }
        }}
      >
        <IconChapBack />
      </button>
    );
  } else
    return (
      <button
        data-title="chapNext"
        className={`text-surface w-12 h-12 md:w-20 md:h-20 bg-gray-200/40 grid place-content-center rounded-full hover:( text-primary bg-primary/10) absolute right-4 top-1/2 -translate-y-1/2 z-30 ${
          !adjacentChaps?.next && "hidden"
        }`}
        onClick={() => {
          if (props.player && adjacentChaps?.next.chapterStart) {
            props.player.currentTime(adjacentChaps?.next.chapterStart);
          }
        }}
      >
        <IconChapNext />
      </button>
    );
}
