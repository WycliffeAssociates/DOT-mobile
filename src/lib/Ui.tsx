import {Preferences} from "@capacitor/preferences";
import {
  IPlaylistData,
  IPlaylistResponse,
  IVidWithCustom,
  IvidJsPlayer,
  chapterMarkers,
  formattedPlaylist,
  validPlaylistSlugs,
} from "../customTypes/types";
import {
  convertTimeToSeconds,
  formatBytesOrMbOrGb,
  formatDuration,
  groupObjectsByKey,
  massageVidsArray,
  reduceToLowestSize,
} from "./utils";
import {Dispatch, SetStateAction} from "react";
import {makeVidSaver} from "./storage";
import {Device} from "@capacitor/device";

export async function getChaptersArrFromVtt(
  vid: IVidWithCustom,
  player: IvidJsPlayer
) {
  cleanUpOldChapters();
  const chapterObj = vid.text_tracks?.find((tt) => tt.kind === "chapters");
  if (!chapterObj || !chapterObj.src || !chapterObj.sources) {
    // setCurrentVid("chapterMarkers", []);
    return [];
  }
  const srcToFetch = chapterObj.sources.find((srcO) =>
    srcO.src?.startsWith("https")
  );
  if (!srcToFetch || !srcToFetch.src) return;
  if (vid.chapterMarkers) return vid.chapterMarkers;

  const chapterVtt = await fetchRemoteChaptersFile(srcToFetch.src);
  if (!chapterVtt) {
    return [];
  }
  const labelRegex = /(?:\d? ?\w+ ?\d*:)(\d+)-(\d+)/;
  /* 
  These should all match: optional digit, optional space, arbitrary num letters, optional space, 1+ number, colon (required), capture all digits after the colon, and be followed by a - and arbitrary digit numbes. 
  2 Pierre 2:1-3
John 2:1-3
2Pierre2:1-3
Luc2:17-28
  */
  const vttChapsArray = chapterVtt
    .split("\n\n")
    .filter((segment) => segment.includes("-->"))
    .map((chapter) => {
      const parts = chapter.split("\n");
      const timeStamp = parts[0].split("-->");

      const startTime = convertTimeToSeconds(timeStamp[0].trim());
      const endTime = convertTimeToSeconds(timeStamp[1].trim());
      const totalDur = player.duration();
      const labelMatches = parts[1].match(labelRegex);
      const xPos = String((startTime / totalDur) * 100);
      return {
        chapterStart: startTime,
        chapterEnd: endTime,
        label: parts[1],
        startVerse: labelMatches ? labelMatches[1] : null,
        endVerse: labelMatches ? labelMatches[2] : null,
        xPos: xPos,
      };
    });
  return vttChapsArray;
}

export async function fetchRemoteChaptersFile(src: string) {
  try {
    const chapterVttRes = await fetch(src);
    const chapterVtt = await chapterVttRes.text();
    return chapterVtt;
  } catch (error) {
    console.error(error);
    return;
  }
}
export function cleanUpOldChapters() {
  const elements = document.querySelectorAll('[data-role="chapterMarker"]');
  elements.forEach((element) => {
    element.remove();
  });
}
export function distributeChapterMarkers(
  markers: chapterMarkers,
  plyr: IvidJsPlayer
) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore  - controlBar does exist.  Typings are wrong
  const sb = plyr.controlBar?.progressControl?.seekBar?.el();
  markers.forEach((marker) => {
    // Escaping the React ecosystem here and manually injecting the markers since videojs controls that part of the dom.

    const chapMarker = document.createElement("span");
    chapMarker.dataset.role = "chapterMarker";

    chapMarker.className = "w-1 h-full inline-block bg-primary absolute";
    chapMarker.style.setProperty("left", `${marker.xPos}%`);
    sb.appendChild(chapMarker);
  });
  // markers.forEach((marker) => {
  //   const chapMarker = <ChapterMarker leftAmt={marker.xPos} />;
  //   sb.appendChild(chapMarker);
  // });
}

export function manageShowingChapterArrows(
  refRect: DOMRect | undefined,
  setterFxn: Dispatch<SetStateAction<any>>
) {
  if (!refRect) return;
  const chapterBtnTrack = document.querySelector(
    '[data-js="chapterButtonTrack"]'
  ) as HTMLUListElement;
  if (!chapterBtnTrack) return;
  if (chapterBtnTrack.scrollWidth > refRect.width) {
    setterFxn(true);
  } else {
    setterFxn(false);
  }
}

interface IhandleVideoJsTaps {
  el: Element;
  leftDoubleFxn: (number: number) => void;
  rightDoubleFxn: (number: number) => void;
  singleTapFxn: () => void;
  doubleTapUiClue: (dir: "LEFT" | "RIGHT" | null, tapCount: number) => void;
}

export function handleVideoJsTaps({
  el,
  leftDoubleFxn,
  rightDoubleFxn,
  singleTapFxn,
  doubleTapUiClue,
}: IhandleVideoJsTaps) {
  let tapCount = 0;
  let tapTimer: number | undefined;
  let lastTapTimestamp = 0;
  let tapX: number;
  let tapSide: "LEFT" | "RIGHT" | null;

  // Threshold in milliseconds to differentiate between taps and double taps
  const thresholdMilliseconds = 250;
  const singleThresholdMilliseconds = 50;

  function handleTap(event: TouchEvent) {
    const target = event.target as HTMLElement;
    const wasOnVideo = target && target.nodeName === "VIDEO";
    if (event.touches.length === 1 && wasOnVideo) {
      el.classList.add("vjs-user-active");
      lastTapTimestamp = event.timeStamp;
      const tapEvent = event.touches[0];
      const boundingRect = target.getBoundingClientRect();
      tapX = tapEvent.clientX - boundingRect.left;
      const leftThreshold = boundingRect.width * 0.3;
      const rightThreshold = boundingRect.width * 0.7;
      tapCount += 1;
      if (tapX <= leftThreshold) {
        tapSide = "LEFT";
      } else if (tapX >= rightThreshold) {
        tapSide = "RIGHT";
      }
    }
  }
  function handleTouchEnd(event: TouchEvent) {
    const currentTimestamp = event.timeStamp;
    // super fast touches likely doubles.
    if (
      tapCount === 1 &&
      currentTimestamp - lastTapTimestamp < singleThresholdMilliseconds
    ) {
      // single tap too brief -- clear"
      clearTapData();
    } else if (tapCount === 1) {
      // exec single tap
      tapTimer = window.setTimeout(() => {
        // exec single tap then clear
        singleTapFxn();
        clearTapData();
      }, thresholdMilliseconds);
    } else if (tapCount > 1) {
      window.clearTimeout(tapTimer);
      doubleTapUiClue(tapSide, tapCount);
      tapTimer = window.setTimeout(() => {
        if (tapSide === "LEFT") {
          leftDoubleFxn(tapCount);
        } else if (tapSide === "RIGHT") {
          rightDoubleFxn(tapCount);
        }
        // if Tapcount 0: clear all
        // if 1: exec single tap
        // if 2: exec double tap
        clearTapData();
      }, thresholdMilliseconds);
    }
    // otherwise
  }

  // Function to clear tap count and timestamps
  function clearTapData() {
    window.clearTimeout(tapTimer);
    tapCount = 0;
    lastTapTimestamp = 0;
    tapSide = null;
  }

  // target.nodeName="VIDEO"
  //       const tapX = event.tagetTouches[0].clientX - boundingClient.left;
  //
  // if so, e.target.getBoundingClientRect
  // bottom, height, left, right, top, width, x, y
  // Determine if the tap occurred within 30% of the left or right edge of the bounding client
  // const leftThreshold = boundingClientWidth * 0.3;
  // const rightThreshold = boundingClientWidth * 0.7;
  el.addEventListener("touchstart", (e) => handleTap(e as TouchEvent));
  el.addEventListener("touchend", (e) => handleTouchEnd(e as TouchEvent));
  // el.addEventListener("touchcancel", clearTapData);
}

interface playerCustomHotKeysParams {
  e: KeyboardEvent;
  vjsPlayer: IvidJsPlayer;
  increment: number;
  setJumpingBackAmount: Dispatch<SetStateAction<number | null | string>>;
  setJumpingForwardAmount: Dispatch<SetStateAction<number | null | string>>;
}
export function playerCustomHotKeys({
  e,
  vjsPlayer,
  increment,
  setJumpingBackAmount,
  setJumpingForwardAmount,
}: playerCustomHotKeysParams) {
  const currentTime = vjsPlayer.currentTime();
  let uiJumpingTimeout: number | null = null;
  switch (e.key) {
    case "ArrowLeft":
      vjsPlayer.currentTime(currentTime - increment);
      setJumpingBackAmount(formatDuration((currentTime - increment) * 1000));
      if (uiJumpingTimeout) {
        window.clearTimeout(uiJumpingTimeout);
      }
      uiJumpingTimeout = window.setTimeout(() => {
        setJumpingBackAmount(null);
      }, 250);
      break;
    case "ArrowRight":
      vjsPlayer.currentTime(currentTime + increment);
      setJumpingForwardAmount(formatDuration((currentTime + increment) * 1000));
      if (uiJumpingTimeout) {
        window.clearTimeout(uiJumpingTimeout);
      }
      uiJumpingTimeout = window.setTimeout(() => {
        setJumpingForwardAmount(null);
      }, 250);
      break;
    default:
      break;
  }
}
export function trackAdjacentChap(
  currentVideo: IVidWithCustom,
  player: IvidJsPlayer
) {
  const next = getAdjacentChap(player, currentVideo, "NEXT");
  const prev = getAdjacentChap(player, currentVideo, "PREV");
  return {next, prev};
}

export function getAdjacentChap(
  player: IvidJsPlayer,
  currentVideo: IVidWithCustom,
  dir: "NEXT" | "PREV"
) {
  if (!player || !currentVideo) return;
  const currentTime = player.currentTime();
  if (currentTime !== 0 && !currentTime) return;

  if (dir == "NEXT") {
    const nextStart = currentVideo.chapterMarkers?.find(
      (marker) => marker.chapterStart > currentTime
    );
    return nextStart || undefined;
  } else if (dir == "PREV") {
    const candidates = currentVideo.chapterMarkers?.filter((marker) => {
      return marker.chapterStart + 3 < currentTime;
    });
    if (!candidates || !candidates.length) return undefined;
    const prevStart = candidates.reduce((acc, current) => {
      return acc.chapterEnd > current.chapterEnd ? acc : current;
    });
    return prevStart || undefined;
  }
}
export function jumpToNextChap(
  player: IvidJsPlayer,
  currentVideo: IVidWithCustom,
  dir: "NEXT" | "PREV"
) {
  if (dir == "NEXT") {
    const nextStart = getAdjacentChap(player, currentVideo, "NEXT");
    if (nextStart) {
      player.currentTime(nextStart.chapterStart);
    }
  } else if (dir == "PREV") {
    const prevStart = getAdjacentChap(player, currentVideo, "PREV");
    if (prevStart) {
      player.currentTime(prevStart.chapterStart);
    }
  }
}

export async function getCurrentPlaylistDataFs(
  playlistSlug: validPlaylistSlugs
) {
  const upToDatePlaylistData = await Preferences.get({
    key: playlistSlug,
  });

  if (!upToDatePlaylistData.value) return undefined;
  return JSON.parse(upToDatePlaylistData.value) as IPlaylistData;
}

export function mutateTimeStampBcResponse(data: Partial<IPlaylistResponse>) {
  const eigthMonthCacheRefresh = 1000 * 60 * 60 * 24 * 240; //1s * 60 (= a min) * 60 ( = hour) * 24 (= a day) * 240 (= about 8 months)
  const twelveMonthExpiry = 1000 * 60 * 60 * 24 * 365;

  // 12 month expiry = refresh now;
  // beyond the 8 month spot though = refresh in background;
  const now = Date.now();
  data.lastFetched = now;
  data.expiresBy = now + twelveMonthExpiry;
  data.refreshBy = now + eigthMonthCacheRefresh;
}

type IupdatePrefsInBackground = {
  existingPlaylistData?: formattedPlaylist;
  playlist: string;
};
export async function updatePrefsInBackground({
  existingPlaylistData,
  playlist,
}: IupdatePrefsInBackground) {
  if (!existingPlaylistData) return;
  const data = await fetchBcApiEndpoint(playlist);
  if (!data || !data.videos) return;
  const {videos, formattedVideos, ...restPlaylistData} = data;

  const castedVids = data.videos as IVidWithCustom[];
  const {sortedVids, filteredByMatchingReferenceId} =
    massageVidsArray(castedVids);
  const groupedBy: formattedPlaylist = groupObjectsByKey<
    IVidWithCustom,
    "book"
  >(sortedVids, "book");
  if (filteredByMatchingReferenceId.notMatching?.length) {
    groupedBy.other = filteredByMatchingReferenceId.notMatching;
  }
  // Iterate though all the existing cached data and look for any video that has "savedSources".  If it does, add it to the new BC data that has freshser manifests and saved that.
  Object.keys(existingPlaylistData).forEach((key) => {
    if (existingPlaylistData[key] && groupedBy[key]) {
      const existingBook = existingPlaylistData[key];
      const sameBookNewData = groupedBy[key];
      existingBook.forEach((book) => {
        if (book.savedSources) {
          // should be the same index, but we are going to use find just to be extra sure.
          const matchingNewBook = sameBookNewData.find((newBook) => {
            return newBook.id == book.id;
          });
          if (matchingNewBook) {
            matchingNewBook.savedSources = book.savedSources;
          }
        }
      });
    }
  });
  mutateTimeStampBcResponse(restPlaylistData);
  await Preferences.set({
    key: playlist,
    value: JSON.stringify({
      formattedVideos: groupedBy,
      ...restPlaylistData,
    }),
  });
}
async function fetchBcApiEndpoint(playlist: string) {
  const policyKey = import.meta.env.VITE_POLICY_KEY;
  const accountId = import.meta.env.VITE_BC_ACCOUNT_ID;
  const url = `https://edge.api.brightcove.com/playback/v1/accounts/${accountId}/playlists/ref:${playlist}?limit=500`;
  try {
    // Todo? fetch new in the bg if connected anyway?
    const response = await fetch(url, {
      headers: {
        Accept: `application/json;pk=${policyKey}`,
      },
    });
    if (!response.ok || response.status >= 400) {
      throw new Error("not found");
    }
    const data = (await response.json()) as IPlaylistResponse;
    return data;
  } catch (error) {
    console.warn(error);
  }
}
export async function fetchBcData(playlist: validPlaylistSlugs) {
  try {
    const savedVersionJson = await Preferences.get({
      key: playlist,
    });
    // Check if we've saved a version in last 3 hours
    let savedData: IPlaylistResponse | null = null;
    if (savedVersionJson.value) {
      savedData = JSON.parse(savedVersionJson.value);
    }

    if (savedData) {
      if (savedData.refreshBy > Date.now()) {
        return savedData;
      } else if (
        savedData.refreshBy < Date.now() &&
        savedData.expiresBy > Date.now()
      ) {
        // This is a background update. If it fails while offline or whatever, it
        updatePrefsInBackground({
          existingPlaylistData: savedData.formattedVideos,
          playlist,
        });
        return savedData;
      }
    }

    const data = await fetchBcApiEndpoint(playlist);
    if (!data) throw new Error("fetch failed");
    mutateTimeStampBcResponse(data);
    return data;
  } catch (error) {
    console.error(error);
    return;
  }
}

// todo delete?
export function getAlreadySavedInBook(book: IVidWithCustom[]) {
  const savedSources = book.filter((vid) => !!vid.savedSources);
  return savedSources;
}

type getDownloadSizeParams = {
  scope: IVidWithCustom[];
  playlistSlug: validPlaylistSlugs;
  maxSigDigits?: number;
  includeAlreadySavedSourcesInCalc?: boolean;
};
export function getDownloadSize({
  scope,
  playlistSlug,
  maxSigDigits,
  includeAlreadySavedSourcesInCalc = false,
}: getDownloadSizeParams) {
  let sizes: number[] = [];
  scope.forEach((vid) => {
    // Only estimate size of non previously saved videos to download
    if (!vid.savedSources?.video || includeAlreadySavedSourcesInCalc) {
      const vidSaver = makeVidSaver(playlistSlug, vid);
      const smallestMp4 = vidSaver.getSmallestMp4();
      const bytes = smallestMp4?.size;
      if (bytes) sizes.push(bytes);
    }
  });
  let totalSize = reduceToLowestSize(sizes);
  const gbSize = 1000 * 1000 * 1000;
  let unit = totalSize >= gbSize ? "gb" : "mb";
  if (unit == "gb") {
    totalSize = totalSize / 1000;
  }

  const intlAmout = new Intl.NumberFormat(navigator.languages[0], {
    maximumSignificantDigits: maxSigDigits || 4,
  }).format(totalSize / 1000 / 1000);
  return `${intlAmout} ${unit}`;
}

type updateStateFromFsParams = {
  playlistSlug: validPlaylistSlugs;
  vid: IVidWithCustom;
  setCurrentVid?: (value: SetStateAction<IVidWithCustom>) => void;
  setCurrentBook?: (value: SetStateAction<IVidWithCustom[]>) => void;
  setShapedPlaylist?: Dispatch<SetStateAction<IPlaylistData | undefined>>;
};
export async function updateStateFromFs({
  playlistSlug,
  vid,
  setCurrentVid,
  setCurrentBook,
  setShapedPlaylist,
}: updateStateFromFsParams) {
  // These are essentially to trigger a rerender by making what's in memmory match what's newly on disk with updates savedSources urls;
  const currentPlaylistData = await getCurrentPlaylistDataFs(playlistSlug);
  if (currentPlaylistData && vid.book) {
    const curVid = currentPlaylistData?.formattedVideos[vid.book].find(
      (v) => v.id == vid.id
    );
    const curBook = currentPlaylistData?.formattedVideos[vid.book];
    if (curVid && setCurrentVid) {
      const newRefVid = structuredClone(curVid);
      setCurrentVid(newRefVid);
    }
    if (curBook && setCurrentBook) {
      const newRefBook = structuredClone(curBook);
      // new reference for state updates
      setCurrentBook(newRefBook);
    }
    if (setShapedPlaylist) {
      setShapedPlaylist(currentPlaylistData);
    }
  }
}
// export async function getDeviceInfo() {
//   const info = await Device.getInfo();
//   const memUsedMb = formatBytesOrMbOrGb(info.memUsed);

//   const realDiskFree = formatBytesOrMbOrGb(info.realDiskFree);
//   const realDiskTotal = formatBytesOrMbOrGb(info.realDiskTotal);
//   setDeviceInfo({
//     memUsed: memUsedMb,
//     realDiskFree: realDiskFree,
//     realDiskTotal,
//   });
// }
