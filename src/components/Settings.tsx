import {IonButton, IonModal, IonIcon} from "@ionic/react";
import {Dispatch, SetStateAction, useEffect, useRef, useState} from "react";

import {settingsOutline} from "ionicons/icons";
import {
  IPlaylistData,
  IVidWithCustom,
  IdeviceInfo,
  chapterMarkers,
  downloadProgressInfo,
  validPlaylistSlugs,
  vidInProgressInfo,
} from "../customTypes/types";
import {makeVidSaver} from "../lib/storage";
import {IconMaterialSymbolsCheckCircle} from "./Icons";
import {useTranslation} from "react-i18next";
import {Device} from "@capacitor/device";
import {VideoJsPlayer} from "video.js";
import {SpeedControl} from "./Settings/SpeedControl";
import {getCurrentPlaylistDataFs, getDownloadSize} from "../lib/Ui";
import {formatBytesOrMbOrGb} from "../lib/utils";
import {DownloadButtons} from "./Settings/DownloadButtons";
import {DeleteButtons} from "./Settings/DeleteButtons";
import {BulkListing} from "./Settings/BulkListing";
import {DownloadProgress} from "./Settings/DownloadProgress";
import {AppMemoryInfo} from "./Settings/DeviceInfo";

type ISettings = {
  player: VideoJsPlayer | undefined;
  playlistData: IPlaylistData;
  playlistSlug: validPlaylistSlugs;
  currentBook: IVidWithCustom[];
  currentVid: IVidWithCustom;
  handleChapters: () => Promise<chapterMarkers | undefined>;
  setCurrentBook: Dispatch<SetStateAction<IVidWithCustom[]>>;
  setShapedPlaylist: Dispatch<SetStateAction<IPlaylistData | undefined>>;
  setCurrentVid: Dispatch<SetStateAction<IVidWithCustom>>;
};
export function Settings(props: ISettings) {
  const modal = useRef<HTMLIonModalElement>(null);
  const [downloadProgress, setDownloadProgress] =
    useState<downloadProgressInfo>();

  const [deviceInfo, setDeviceInfo] = useState<IdeviceInfo>();
  const [currentWorkingVideoInfo, setCurrentWorkingVideoInfo] =
    useState<vidInProgressInfo>();
  const {t} = useTranslation();

  async function getDeviceInfo() {
    const info = await Device.getInfo();

    const memUsedMb = info.memUsed ? formatBytesOrMbOrGb(info.memUsed) : null;
    const realDiskFree = info.realDiskFree
      ? formatBytesOrMbOrGb(info.realDiskFree)
      : null;
    const realDiskTotal = info.realDiskTotal
      ? formatBytesOrMbOrGb(info.realDiskTotal)
      : null;
    setDeviceInfo({
      memUsed: memUsedMb,
      realDiskFree: realDiskFree,
      realDiskTotal,
    });
  }

  async function saveVidOffline(
    vidToSave: IVidWithCustom = props.currentVid,
    playlistData: IPlaylistData = props.playlistData
  ) {
    const vidName =
      vidToSave.name || vidToSave.reference_id || vidToSave.id || "Unnamed Vid";
    setDownloadProgress({
      amount: 0,
      started: true,
      vidName,
    });
    const vidSaver = makeVidSaver(props.playlistSlug, vidToSave);

    if (!vidToSave.book) return;

    const playlistClone = structuredClone(playlistData);
    const currBookInThatClone = playlistClone.formattedVideos[vidToSave.book];
    const currentVidInThatClone = playlistClone.formattedVideos[
      vidToSave.book
    ].find((vid: IVidWithCustom) => vid.id == vidToSave.id);
    if (!currentVidInThatClone) return;

    await vidSaver.ensurePlaylistDirExists();
    // Get the mp4 src for later;
    const smallestMp4 = vidSaver.getSmallestMp4();
    if (!smallestMp4) return;
    // Save the poster src adn blob
    const posterSrc = await vidSaver.savePosterBlobAndGetSrc();

    if (!currentVidInThatClone.savedSources) {
      currentVidInThatClone.savedSources = {};
    }
    currentVidInThatClone.savedSources.poster = posterSrc;
    // Get Chapter markers saved if they weren't for some reason
    if (!currentVidInThatClone.chapterMarkers) {
      const chapters = await props.handleChapters();
      currentVidInThatClone.chapterMarkers = chapters ? chapters : [];
    }

    const fileSize = await vidSaver.getFileSize(smallestMp4.src);
    if (!fileSize) return;
    const {chunksRequestsToMake, allExpectedChunks} =
      await vidSaver.calculateNeededRangesToFetch(fileSize);
    const alreadyFetched =
      allExpectedChunks.length - chunksRequestsToMake.length;
    let fetchNum = alreadyFetched == 0 ? 1 : alreadyFetched;
    const fetchSession = [...chunksRequestsToMake]; //need a copy to mutate in method below;

    for await (const segmentToFetch of chunksRequestsToMake) {
      await vidSaver.writeBlobChunk({
        segmentToFetch,
        url: smallestMp4.src,
      });
      await vidSaver.updateWipAndGetNewFetchSession(fetchSession);
      let progressAmount = fetchNum / allExpectedChunks.length;

      if (progressAmount == 1) {
        // artificially set the progress at just below 100 to finish up this last been of code in which we are cleaning caches / combining the blob parts etc;
        progressAmount = 0.98;
      }
      const updatedAmount = {
        started: true,
        amount: progressAmount,
        vidName,
      };
      setDownloadProgress(updatedAmount);
      fetchNum += 1;
    }

    const result = await vidSaver.aggregateWipBlobsIntoOneAndWriteFs(
      allExpectedChunks
    );
    // todo: some error handling here?
    if (result && !result.ok) return;
    // await vidSaver.
    const mp4FsSource = await vidSaver.getCapacitorSrcForFinalBlob();
    currentVidInThatClone.savedSources.video = mp4FsSource;
    currentVidInThatClone.savedSources.dateSavedIso = new Date().toISOString();

    await vidSaver.deleteWipChunkedVidBlobs();
    await vidSaver.deleteWipPrefsData();
    await vidSaver.updateCachedPlaylist(playlistClone);

    // todo: call set state of playlistData now that we have some offline resource saved;
    // update in memory
    props.setShapedPlaylist(playlistClone);
    await vidSaver.updateCachedPlaylist(playlistClone);
    setDownloadProgress({
      amount: 1,
      started: true,
      vidName,
    });
  }

  async function checkCurrentDownloadedStatus() {
    const vidSaver = makeVidSaver(props.playlistSlug, props.currentVid);
    const currSaved = await vidSaver.getCurrentAmountFetched();
    setCurrentWorkingVideoInfo({
      vidName: props.currentVid.name!,
      percentAlreadyDownloaded: currSaved,
    });
  }

  //=============== EFFECTS  =============
  useEffect(() => {
    getDeviceInfo();
    checkCurrentDownloadedStatus();
  }, [downloadProgress]);

  return (
    <>
      <div className="flex">
        <IonButton
          id="open-modal"
          shape="round"
          fill="clear"
          className="text-surface"
          style={{
            "--padding-start": ".25rem",
            "--padding-end": 0,
          }}
        >
          {/* <IconMaterialSymbolsSettingsOutline  className="text-surface" /> */}
          <IonIcon slot="icon-only" icon={settingsOutline} />
        </IonButton>

        {props.currentVid.savedSources?.video && (
          <span className="w-6 inline-block ml-2">
            <IconMaterialSymbolsCheckCircle className="text-green-800 w-full h-full" />
          </span>
        )}
      </div>
      {/* <div className="w-full"> */}
      <IonModal
        ref={modal}
        trigger="open-modal"
        initialBreakpoint={1}
        breakpoints={[0, 1]}
        backdropBreakpoint={0.9}
      >
        <div className="block h-[350px] p-2 overflow-auto">
          <SpeedControl player={props.player} />
          <div data-name="downloadSection">
            <h2 className="font-bold mb-2">{t("downloadOptions")}</h2>
            <DownloadButtons
              downloadProgress={downloadProgress}
              setCurrentVid={props.setCurrentVid}
              setCurrentBook={props.setCurrentBook}
              setDownloadProgress={setDownloadProgress}
              currentBook={props.currentBook}
              currentVid={props.currentVid}
              playlistSlug={props.playlistSlug}
              saveVidOffline={saveVidOffline}
              currentWorkingVideoInfo={currentWorkingVideoInfo}
            />
          </div>

          <DeleteButtons
            downloadProgress={downloadProgress}
            setCurrentBook={props.setCurrentBook}
            setCurrentVid={props.setCurrentVid}
            currentBook={props.currentBook}
            currentVid={props.currentVid}
            playlistSlug={props.playlistSlug}
          />
          {/* <div> */}

          <DownloadProgress downloadProgress={downloadProgress} />
          {/* )} */}
          {/* </div> */}
          <BulkListing
            downloadProgress={downloadProgress}
            setCurrentBook={props.setCurrentBook}
            setCurrentVid={props.setCurrentVid}
            playlistSlug={props.playlistSlug}
            playlistData={props.playlistData}
            setDownloadProgress={setDownloadProgress}
            saveVidOffline={saveVidOffline}
            currentBook={props.currentBook}
            currentVid={props.currentVid}
          />

          <AppMemoryInfo deviceInfo={deviceInfo} />
        </div>
      </IonModal>
      {/* </div> */}
    </>
  );
}
