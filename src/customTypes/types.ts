import videojs, {VideoJsPlayer} from "video.js";
import type {PlaylistResponse, Video, VideoSources} from "./bcApi";
import brightCovePlaylistConfig from "../brightcove/playlist-mappers";

declare global {
  interface Window {
    bc: (...args: any[]) => videojs.Player;
  }
}
export type formattedPlaylist = Record<string, IVidWithCustom[]>;

export type IPlaylistResponse = PlaylistResponse & {
  lastFetched: number;
  expiresBy: number;
  refreshBy: number;
  formattedVideos: formattedPlaylist | undefined;
};
export type IPlaylistData = PlaylistResponse & {
  lastFetched: number;
  expiresBy: number;
  formattedVideos: formattedPlaylist;
};
export type IvidJsPlayer = videojs.Player;
export interface IVidWithCustom extends Video {
  book: string | undefined;
  originalIdx?: number | null;
  slugName?: string | null;
  chapter?: string | null;
  localizedBookName: string | undefined;
  custom_fields: Video["custom_fields"] & {
    book?: string;
    chapter?: string;
    country?: string;
    language?: string;
    localized_book_name?: string;
  };
  sources: customVideoSources[];
  chapterMarkers: chapterMarkers;
  savedSources?: {
    poster?: string;
    video?: string;
    dateSavedIso?: string;
  };
}
export interface customVideoSources extends VideoSources {
  src: string;
  name?: string;
  refId?: string;
}

export type chapterMarkers = {
  chapterStart: number;
  chapterEnd: number;
  label: string;
  xPos: string;
  startVerse: string | null;
  endVerse: string | null;
}[];
export type AnyFunction<Args extends never[], Return> = (
  ...args: Args
) => Return;
export type AnyAsyncFunction<Args extends never[], Return> = (
  ...args: Args
) => Promise<Return>;

export interface userPreferencesI {
  preferUsingSavedVideoIfAvailable?: boolean;
  prefersDark?: boolean;
  playbackSpeed?: string;
}
export type fetchSession = Array<{start: number; end: number}>;

export type writeAnInProgressBlobParams = {
  segmentToFetch: {start: number; end: number};
  url: string;
};

export type vidSavingWipData = {
  mp4FileName?: string;
  expected: {start: number; end: number}[];
  fetchesToMake: {
    start: number;
    end: number;
  }[];
};
export type IappState = {
  currentTime?: number;
  currentBookName?: string;
  currentVidId?: string;
  preferredSpeed?: number;
};

export type validPlaylistSlugs =
  (typeof brightCovePlaylistConfig)[keyof typeof brightCovePlaylistConfig]["playlist"];

export type vidInProgressInfo = {
  vidName: string;
  percentAlreadyDownloaded: number;
};

export type downloadProgressInfo = {
  started: boolean;
  amount: number;
  vidName: string;
};

export type changeVidParams = {
  chapNum: string | null | undefined;
  bookToUse?: IVidWithCustom[];
};
export type changePlayerSrcParams = {
  vid: IVidWithCustom;
  bookToUse?: IVidWithCustom[];
  // player? : VideoJsPlayer
};
export type IdeviceInfo = {
  memUsed: string | null;
  realDiskFree: string | null;
  realDiskTotal: string | null;
};

export type IadjacentChap =
  | {
      chapterStart: number;
      chapterEnd: number;
      label: string;
      xPos: string;
      startVerse: string | null;
      endVerse: string | null;
    }
  | undefined;
