import {useCallback, useEffect, useRef, useState} from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  useIonViewWillEnter,
  IonLoading,
  IonAlert,
} from "@ionic/react";
import {useParams} from "react-router";
import {Preferences} from "@capacitor/preferences";
import {DotLogo} from "../components/Icons";
import {VidJsPlayer} from "../components/Player";
import {
  IPlaylistData,
  IPlaylistResponse,
  IVidWithCustom,
  IappState,
  IvidJsPlayer,
  changePlayerSrcParams,
  changeVidParams,
  formattedPlaylist,
} from "../customTypes/types";
import {
  formatPlayListName,
  groupObjectsByKey,
  massageVidsArray,
} from "../lib/utils";
import {
  getSavedAppPreferences,
  updateSavedAppPreferences,
} from "../lib/storage";
import {
  distributeChapterMarkers,
  fetchBcData,
  getChaptersArrFromVtt,
  getCurrentPlaylistDataFs,
  handleVideoJsTaps,
  playerCustomHotKeys,
} from "../lib/Ui";
import {ChapterSelector} from "../components/ChapterSelector";
import {PlaylistInfo} from "../components/PlaylistInfo";
import {PlaylistBookPicker} from "../components/PlaylistBookPicker";
import brightCovePlaylistConfig from "../brightcove/playlist-mappers";
import {JumpDisplay} from "../components/JumpDisplay";
import {VerseSegmentJump} from "../components/VerseSegmentJump";
import {trackAdjacentChap} from "../lib/Ui";
import {Settings} from "../components/Settings";
import {useTranslation} from "react-i18next";

function Playlist() {
  const {playlist: urlSlug} = useParams<{playlist: string}>();
  const playlistInfo = Object.values(brightCovePlaylistConfig).find(
    (value) => value.path == urlSlug
  )!;
  const {t} = useTranslation();
  const [isFetching, setIsFetching] = useState(true);
  const [shapedPlaylist, setShapedPlaylist] = useState<IPlaylistData>();
  const [vidJsPlayer, setVidJsPlayer] = useState<IvidJsPlayer>();
  const [currentBook, setCurrentBook] = useState<IVidWithCustom[]>(
    {} as IVidWithCustom[]
  );
  const [currentVid, setCurrentVid] = useState<IVidWithCustom>(
    {} as IVidWithCustom
  );
  const [showChapSliderButtons, setShowChapSliderButtons] = useState(true);
  type jumpParam = null | number | string;
  const [jumpingForwardAmount, setJumpingForwardAmount] =
    useState<jumpParam>(null);
  const [jumpingBackAmount, setJumpingBackAmount] = useState<jumpParam>(null);
  // todo: see about typing ionic compoennts
  const alertRef: any = useRef(null);

  /*// #===============  PAGE FUNCTIONS   =============   */

  function changePlayerSrc({vid, bookToUse}: changePlayerSrcParams) {
    const plyr = vidJsPlayer;
    plyr?.pause();
    changeVid({chapNum: vid.chapter, bookToUse});
    const httpsOnly = vid.sources.filter((srcObj) =>
      srcObj.src.startsWith("https")
    );
    const savedSrc = vid.savedSources?.video && {
      src: `${vid.savedSources?.video!}`,
      type: "video/mp4",
    };
    const savedPoster = vid.savedSources?.poster;

    savedSrc ? plyr?.src(savedSrc) : plyr?.src(httpsOnly);
    savedPoster
      ? plyr?.poster(savedPoster)
      : vid.poster
      ? plyr?.poster(vid.poster)
      : null;
    // plyr?.load();
    plyr?.one("loadedmetadata", () => {
      handleChapters(vid, plyr);
    });
    // plyr?.play();
  }

  function changeVid({chapNum, bookToUse}: changeVidParams) {
    let book = bookToUse || currentBook;
    if (!chapNum || !book) return;
    const newVid = book.find((vid) => vid.chapter == chapNum);
    if (!newVid) return;
    // Basically anything watching newVid needs to rerender.   Ran into some issues with some stale closures (I think) in callbacks and event listeners with video js
    const newVidReference = structuredClone(newVid);
    if (newVid) {
      setCurrentVid(newVidReference);
    }
  }

  /* 
  const changeVid = useCallback(
    ({chapNum, bookToUse}: changeVidParams) => {
      let book = bookToUse || currentBook;
      if (!chapNum || !book) return;
      const newVid = book.find((vid) => vid.chapter == chapNum);
      if (newVid) {
        setCurrentVid(newVid);
      }
    },
    [currentBook, currentVid]
  );

  */

  async function handleChapters(
    vid: IVidWithCustom,
    vidJsPlayer: IvidJsPlayer | undefined
  ) {
    if (!vidJsPlayer) return;
    const chapters = await getChaptersArrFromVtt(vid, vidJsPlayer);
    console.log("HANDLED CHAPTERS RAN");
    if (chapters) {
      setCurrentVid((vid) => {
        vid.chapterMarkers = chapters;
        return vid;
      });
    } else {
      setCurrentVid((vid) => {
        vid.chapterMarkers = [];
        return vid;
      });
    }
    if (chapters) {
      distributeChapterMarkers(chapters, vidJsPlayer);
    }
    return chapters;
  }

  /* 
   const handleChapters = useCallback(
    async (vid: IVidWithCustom, vidJsPlayer: IvidJsPlayer | undefined) => {
      if (!vidJsPlayer) return;
      const chapters = await getChaptersArrFromVtt(vid, vidJsPlayer);
      console.log("HANDLED CHAPTERS RAN");
      if (chapters) {
        setCurrentVid((vid) => {
          vid.chapterMarkers = chapters;
          return vid;
        });
      } else {
        setCurrentVid((vid) => {
          vid.chapterMarkers = [];
          return vid;
        });
      }
      if (chapters) {
        distributeChapterMarkers(chapters, vidJsPlayer);
      }
      return chapters;
    },
    [currentBook, currentVid]
  );
  */

  async function setNewBook(vids: IVidWithCustom[]) {
    const bookName = vids[0].book;
    // treat the fs as source of truth since it's getting saved to in various places
    const mostRecentData = await getCurrentPlaylistDataFs(
      playlistInfo.playlist
    );
    if (!mostRecentData) return;
    let matchingSetVids =
      mostRecentData && bookName
        ? mostRecentData.formattedVideos[bookName]
        : vids;
    const firstBook = matchingSetVids[0];
    console.log("setCurrentBook running");
    setCurrentBook(vids);
    changePlayerSrc({vid: firstBook, bookToUse: vids});
  }
  /* 
  const setNewBook = useCallback(
    async (vids: IVidWithCustom[]) => {
      const bookName = vids[0].book;
      // treat the fs as source of truth since it's getting saved to in various places
      const mostRecentData = await getCurrentPlaylistDataFs(
        playlistInfo.playlist
      );
      if (!mostRecentData) return;
      let matchingSetVids =
        mostRecentData && bookName
          ? mostRecentData.formattedVideos[bookName]
          : vids;
      const firstBook = matchingSetVids[0];
      console.log("setCurrentBook running");
      setCurrentBook(vids);
      changePlayerSrc({vid: firstBook, bookToUse: vids});
    },
    [currentBook, currentVid]
  );
  */
  async function fetchAndSetup() {
    try {
      const data = await fetchBcData(playlistInfo.playlist);
      // Put into state setter here;
      if (!data) {
        throw new Error("fetching failed");
      }

      const vids = data.videos as IVidWithCustom[];
      const {videos, formattedVideos, ...restPlaylistData} = data;
      doInitialSetup(vids, formattedVideos, restPlaylistData);
    } catch (error) {
      let loading = document.querySelector("ion-loading");
      if (loading) {
        loading.remove();
      }
      if (alertRef.current) {
        alertRef.current.message = t("errorOccured");
        alertRef.current.header = t("error");
        alertRef.current.isOpen = true;
      }
    }
  }

  /* 
  
  const fetchAndSetup = useCallback(async () => {
    try {
      const data = await fetchBcData(playlistInfo.playlist);
      // Put into state setter here;
      if (!data) {
        throw new Error("fetching failed");
      }

      const vids = data.videos as IVidWithCustom[];
      const {videos, formattedVideos, ...restPlaylistData} = data;
      doInitialSetup(vids, formattedVideos, restPlaylistData);
    } catch (error) {
      let loading = document.querySelector("ion-loading");
      if (loading) {
        loading.remove();
      }
      if (alertRef.current) {
        alertRef.current.message = t("errorOccured");
        alertRef.current.header = t("error");
        alertRef.current.isOpen = true;
      }
    }
  }, []);
  */

  function autoPlayToNextBook() {
    const player = vidJsPlayer;
    if (!player || !shapedPlaylist) return;
    const curVid = currentBook.find((v) => v.id === currentVid.id);
    if (!curVid) return;
    const currentIdx = currentBook.indexOf(curVid);
    if (currentIdx < currentBook.length - 1) {
      const nextVidInBook = currentBook[currentIdx + 1];
      console.log(`calling changePlayerSrc with ${nextVidInBook.chapter}`);
      player.currentTime(0);
      // todo: pass the player, cause Idk why the player is being undefined from when called here.  Just use the state as default and make this optional.

      changePlayerSrc({
        vid: nextVidInBook,
        bookToUse: currentBook,
      });
    } else if (currentIdx === currentBook.length - 1) {
      if (!currentVid.book) return;
      const keys = Object.keys(shapedPlaylist?.formattedVideos);
      const keyIdx = keys.indexOf(currentVid.book);
      const nextKey = keys[keyIdx + 1];
      // E.g From one book to next
      if (nextKey && shapedPlaylist?.formattedVideos[nextKey]) {
        const nextBook = shapedPlaylist?.formattedVideos[nextKey];
        setNewBook(nextBook);
      } else {
        // Noop: If there isn't a next vid or book, we should be at Rev 22
      }
    }
  }

  useEffect(() => {
    if (vidJsPlayer) {
      // Using one each time a vid ends to try to avoid a stale closures issue that has cropped up some with react and videos js
      vidJsPlayer.one("ended", autoPlayToNextBook);
    }
  }, [currentVid, vidJsPlayer]);

  async function doInitialSetup(
    vids: IVidWithCustom[],
    alreadyBucketizedData: formattedPlaylist | undefined,
    restPlaylistData: Omit<IPlaylistResponse, "videos" | "formattedVideos">
  ) {
    // todo also for initial setup:
    // get preferred watching speed from saved "state.json"
    // get currentVid, currentBook, current
    const alreadySavedState = await Preferences.get({
      key: "appState",
    });
    const stringifiedValue = alreadySavedState.value;

    let parsedState: IappState | null = stringifiedValue
      ? JSON.parse(stringifiedValue)
      : null;
    if (
      !parsedState ||
      !parsedState?.currentBookName ||
      !parsedState?.currentVidId
    ) {
      parsedState = null;
    }

    //=============== SORT INTO BOOKS IN CANONICAL ORDER  =============
    let bucketToUse: formattedPlaylist;
    if (alreadyBucketizedData) {
      bucketToUse = alreadyBucketizedData;
    } else {
      const {sortedVids, filteredByMatchingReferenceId} =
        massageVidsArray(vids);
      bucketToUse = groupObjectsByKey<IVidWithCustom, "book">(
        sortedVids,
        "book"
      );
      if (filteredByMatchingReferenceId.notMatching?.length) {
        bucketToUse.other = filteredByMatchingReferenceId.notMatching;
      }
    }

    // todo: set other initial stuff based on routing and not just firstBook/chapter

    const keys = Object.keys(bucketToUse);
    let firstBookShow: IVidWithCustom[] = bucketToUse[keys[0]]; //default
    if (parsedState?.currentBookName) {
      const key = parsedState?.currentBookName;
      if (key) {
        firstBookShow = bucketToUse[key];
      }
    }
    let firstVid = firstBookShow[0];
    if (parsedState?.currentVidId) {
      const fsVid = firstBookShow.find(
        (vid) => vid.id == parsedState?.currentVidId
      );
      if (fsVid) {
        firstVid = fsVid;
      }
    }
    const shapedPlaylist = {
      formattedVideos: bucketToUse,
      ...restPlaylistData,
    };

    setCurrentBook(firstBookShow);
    setCurrentVid(firstVid);
    setShapedPlaylist(shapedPlaylist);
    setIsFetching(false);
    await Preferences.set({
      key: playlistInfo.playlist,
      value: JSON.stringify({
        formattedVideos: bucketToUse,
        ...restPlaylistData,
      }),
    });
  }

  async function updateCachedStateDuringProgress() {
    if (vidJsPlayer && currentBook && currentVid) {
      const currentTime = vidJsPlayer.currentTime();
      const currentAppState = await getSavedAppPreferences();
      let stateToSave: IappState = {
        currentTime: currentTime,
        currentBookName: currentVid.book,
        currentVidId: currentVid.id,
      };
      const newAppPrefs = {
        ...currentAppState,
        ...stateToSave,
      };
      await updateSavedAppPreferences(newAppPrefs);

      console.log(
        `updated stateToSave ${currentVid.book} and ${currentVid.chapter}`
      );
      console.log(currentVid.chapter);
    }
  }

  /*// #=============== END PAGE FUNCTIONS   =============   */

  useIonViewWillEnter(() => {
    fetchAndSetup();
  }, []);

  // MANAGE EFFECTS FOR HEN PLAYER CHANGES

  useEffect(() => {
    updateCachedStateDuringProgress();
  }, [currentVid, currentBook]);

  /*//# ===============  MARKUP   =============   */
  return (
    <IonPage id="test-page">
      <IonHeader className=" bg-base">
        <IonToolbar>
          <span className="w-32 block mx-auto">
            <a href="/">
              <DotLogo />
            </a>
          </span>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonAlert
          ref={alertRef}
          header={t("errorOccurred")}
          buttons={["OK"]}
          onDidDismiss={() => {
            alertRef.current.isOpen = false;
          }}
        ></IonAlert>
        <IonLoading message={t("loading")} isOpen={isFetching} />

        <div>
          <div className="overflow-x-hidden max-w-[1000px] mx-auto w-full sm:rounded-lg">
            {shapedPlaylist && shapedPlaylist.formattedVideos && (
              <div>
                <div className="w-full mx-auto   relative  sm:(rounded-lg overflow-hidden)">
                  <VerseSegmentJump
                    currentVideo={currentVid}
                    player={vidJsPlayer}
                    dir="back"
                  />
                  {jumpingBackAmount && (
                    <JumpDisplay
                      dir="back"
                      id="seekRippleBackward"
                      text={String(jumpingBackAmount)}
                    />
                  )}
                  <VidJsPlayer
                    handleChapters={handleChapters}
                    changePlayerSrc={changePlayerSrc}
                    currentBook={currentBook}
                    setNewBook={setNewBook}
                    setJumpingBackAmount={setJumpingBackAmount}
                    setJumpingForwardAmount={setJumpingForwardAmount}
                    setPlayer={setVidJsPlayer}
                    playlistData={shapedPlaylist.formattedVideos}
                    currentVid={currentVid}
                  />
                  {jumpingForwardAmount && (
                    <JumpDisplay
                      dir="forward"
                      id="seekRippleForward"
                      text={String(jumpingForwardAmount)}
                    />
                  )}
                  <VerseSegmentJump
                    currentVideo={currentVid}
                    player={vidJsPlayer}
                    dir="forward"
                  />
                </div>

                <Settings
                  setCurrentVid={setCurrentVid}
                  player={vidJsPlayer}
                  playlistData={shapedPlaylist}
                  currentBook={currentBook}
                  currentVid={currentVid}
                  handleChapters={() => handleChapters(currentVid, vidJsPlayer)}
                  playlistSlug={playlistInfo.playlist}
                  setShapedPlaylist={setShapedPlaylist}
                  setCurrentBook={setCurrentBook}
                />
                {currentBook && (
                  <ChapterSelector
                    showChapSliderButtons={showChapSliderButtons}
                    chapterButtonOnClick={(vid: IVidWithCustom) => {
                      changePlayerSrc({
                        vid,
                      });
                    }}
                    currentVid={currentVid}
                    currentBook={currentBook}
                  />
                )}
                <PlaylistInfo
                  currentVid={currentVid}
                  playlist={playlistInfo.playlist}
                />
                <PlaylistBookPicker
                  currentVid={currentVid}
                  vids={shapedPlaylist.formattedVideos}
                  setShowChapSliderButtons={setShowChapSliderButtons}
                  setNewBook={setNewBook}
                />
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

export default Playlist;
