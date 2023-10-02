import {
  IVidWithCustom,
  changePlayerSrcParams,
  chapterMarkers,
} from "../customTypes/types";
import {Dispatch, SetStateAction, useEffect, useRef} from "react";
import {getSavedAppPreferences} from "../lib/storage";
import {handleVideoJsTaps, playerCustomHotKeys} from "../lib/Ui";
import {VideoJsPlayer} from "video.js";
import {Capacitor} from "@capacitor/core";
type Iplayer = {
  setPlayer: Dispatch<SetStateAction<VideoJsPlayer | undefined>>;
  playlistData: Record<string, IVidWithCustom[]>;
  currentVid: IVidWithCustom;
  currentBook: IVidWithCustom[];
  setJumpingForwardAmount: Dispatch<SetStateAction<string | number | null>>;
  setJumpingBackAmount: Dispatch<SetStateAction<string | number | null>>;
  changePlayerSrc({vid, bookToUse}: changePlayerSrcParams): void;
  setNewBook(vids: IVidWithCustom[]): Promise<void>;
  handleChapters(
    vid: IVidWithCustom,
    vidJsPlayer: VideoJsPlayer | undefined
  ): Promise<chapterMarkers | undefined>;
};

export function VidJsPlayer({
  setPlayer,
  playlistData,
  currentBook,
  currentVid,
  setJumpingBackAmount,
  setJumpingForwardAmount,
  changePlayerSrc,
  setNewBook,
  handleChapters,
}: Iplayer) {
  const vidPlayerRef = useRef(null);

  async function bootPlayer() {
    console.log("running boot");
    if (playlistData) {
      let curAppState = await getSavedAppPreferences();
      // SPEED
      const preferredSpeed = curAppState?.preferredSpeed || 1;
      const jumpAmount = 5; //seconds to jump on double taps;
      const firstBook = currentVid;
      // Resume src, offline or stream
      const firstVidSrces = firstBook.savedSources?.video
        ? {
            src: `${firstBook.savedSources?.video!}`,
            type: "video/mp4",
          }
        : firstBook.sources;

      const firstPoster = firstBook.savedSources?.poster
        ? firstBook.savedSources?.poster
        : firstBook.poster;

      // instantiate player
      // window.bc is from /bc/willPlayer.  This is a brightcove player that has been manually downloaded and included to avoid the network request for a 200kb + video js player.  This allows us to bundle it for offline usage in mobile app more easily too.  We could just use video js, but the bundled / minified player includes brightcoves built in analytics. If we are offline, they won't send, but that's a noop at that point. The priority is availability.
      // SEe https://videojs.com/guides/options/ for options
      const player = window.bc(vidPlayerRef.current, {
        responsive: true,
        fluid: true,
        fill: true,
        controls: true,
        playbackRates: [0.5, 1, 1.5, 2, 2.5],
        preload: "auto",
        autoplay: false,
        fullscreen: {
          navigationUI: "show",
        },
        sources: firstVidSrces,
        poster: firstPoster,
        nativeControlsForTouch: true,
      });
      player.playbackRate(preferredSpeed);
      player.language(navigator.languages[0]);
      player.playsinline(true); //ios

      // Get initial chapters if present
      player?.one("loadedmetadata", () => {
        handleChapters(currentVid, player);
      });

      const videoJsDomEl = player.el();
      // Handle mobile taps
      handleVideoJsTaps({
        el: videoJsDomEl,
        rightDoubleFxn(number) {
          const curTime = player?.currentTime();
          if (!curTime) return;
          // the extra minus jumpAmount is to account for fact that min tap amoutn is 2 to diff btw double and single taps, so we still want to allow the smallest measure of jump back;
          const newTime = number * jumpAmount + curTime - jumpAmount;
          player?.currentTime(newTime);
          setJumpingForwardAmount(null);
          videoJsDomEl.classList.remove("vjs-user-active");
        },
        leftDoubleFxn(number) {
          const curTime = player?.currentTime();
          if (!curTime) return;

          const newTime = curTime - number * jumpAmount - jumpAmount;
          player?.currentTime(newTime);
          setJumpingBackAmount(null);
          videoJsDomEl.classList.remove("vjs-user-active");
        },
        singleTapFxn() {
          if (!player) return;
          if (player.paused()) {
            player.play();
          } else {
            player.pause();
          }
        },
        doubleTapUiClue(dir, tapsCount) {
          if (dir == "LEFT") {
            setJumpingBackAmount(tapsCount * jumpAmount - 5);
            setJumpingForwardAmount(null);
          } else if (dir == "RIGHT") {
            setJumpingBackAmount(null);
            setJumpingForwardAmount(tapsCount * jumpAmount - 5);
          }
        },
      });

      // @MANAGE KEYS TO SKIP
      player.on("keydown", (e: KeyboardEvent) =>
        playerCustomHotKeys({
          e,
          vjsPlayer: player,
          increment: jumpAmount,
          setJumpingBackAmount,
          setJumpingForwardAmount,
        })
      );

      player.on("fullscreenchange", (e) => {
        const isFullScreen = player.isFullscreen();
        if (Capacitor.getPlatform() === "ios") {
          // noop IOS handles it
        } else if (Capacitor.getPlatform() === "android") {
          if (isFullScreen) {
            // document.body.style.transform = "rotate(90deg)";
          } else {
            // document.body.style.transform = "rotate(0deg)";
          }
        } else {
          console.log("web");
          if (isFullScreen) {
            // document.body.style.transform = "rotate(90deg)";
          } else {
            // document.body.style.transform = "rotate(0deg)";
          }
        }
      });

      // Finally set state
      setPlayer(player);
    }
  }

  useEffect(() => {
    bootPlayer();
  }, [playlistData]);
  useEffect(() => {}, [currentBook, currentVid]);
  return (
    <div className="aspect-video  mx-auto">
      {playlistData && (
        <video ref={vidPlayerRef} className="video-js" controls src=""></video>
      )}
    </div>
  );
}
