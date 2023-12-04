import {Dispatch, SetStateAction, useEffect} from "react";
import {useTranslation} from "react-i18next";
import {
  IPlaylistData,
  IVidWithCustom,
  validPlaylistSlugs,
} from "src/customTypes/types";
import {IonButton} from "@ionic/react";
import {vidInProgressInfo, downloadProgressInfo} from "../../customTypes/types";

import {
  getAlreadySavedInBook,
  getCurrentPlaylistDataFs,
  getDownloadSize,
  updateStateFromFs,
} from "../../lib/Ui";

type IDownloadButtonsParams = {
  playlistSlug: validPlaylistSlugs;
  currentBook: IVidWithCustom[];
  currentVid: IVidWithCustom;
  saveVidOffline(
    vidToSave?: IVidWithCustom,
    playlistData?: IPlaylistData
  ): Promise<void>;
  setDownloadProgress: (
    value: SetStateAction<
      | {
          started: boolean;
          amount: number;
          vidName: string;
        }
      | undefined
    >
  ) => void;
  setCurrentBook: Dispatch<SetStateAction<IVidWithCustom[]>>;
  currentWorkingVideoInfo: vidInProgressInfo | undefined;
  setCurrentVid: Dispatch<SetStateAction<IVidWithCustom>>;
  downloadProgress: downloadProgressInfo | undefined;
};
export function DownloadButtons(props: IDownloadButtonsParams) {
  const {t} = useTranslation();

  async function saveBooks(scope: IVidWithCustom[]) {
    for await (const vidChapter of scope) {
      if (!vidChapter.savedSources?.poster || !vidChapter.savedSources.video) {
        props.setDownloadProgress({
          amount: 0,
          started: true,
          vidName:
            vidChapter.name ||
            vidChapter.reference_id ||
            vidChapter.id ||
            "Unnamed Vid",
        });
        const currentPlaylistData = await getCurrentPlaylistDataFs(
          props.playlistSlug
        );
        await props.saveVidOffline(vidChapter, currentPlaylistData);
        await updateStateFromFs({
          playlistSlug: props.playlistSlug,
          vid: vidChapter,
          setCurrentBook: props.setCurrentBook,
          setCurrentVid:
            scope.length === 1
              ? props.setCurrentVid
              : vidChapter.id === props.currentVid.id
              ? props.setCurrentVid
              : undefined,
        });
      }
    }
    // clear progress bar:
    setTimeout(() => {
      props.setDownloadProgress({
        amount: 0,
        started: false,
        vidName:
          props.currentVid.name ||
          props.currentVid.reference_id ||
          "unknown video",
      });
    }, 1000);
  }
  function bookIsCompletelySaved() {
    // return (
    //   getAlreadySavedInBook(props.currentBook).length ==
    //   props.currentBook.length
    // );
    return props.currentBook.every((b) => {
      return !!b.savedSources;
    });
  }

  function DownloadSize() {
    return (
      <>
        <br />
        {getDownloadSize({
          playlistSlug: props.playlistSlug,
          scope: [props.currentVid],
        })}
      </>
    );
  }
  function PartiallyDownloadedSize() {
    if (props.currentWorkingVideoInfo) {
      return (
        <>
          <br />
          {t("partiallySavedAmount", {
            percent: new Intl.NumberFormat(navigator.languages[0], {
              style: "percent",
              maximumFractionDigits: 0,
            }).format(props.currentWorkingVideoInfo.percentAlreadyDownloaded),
          })}
        </>
      );
    } else return null;
  }
  const isDownloadBtnDisabled = () => {
    return props.currentVid.savedSources?.video ||
      props.downloadProgress?.started
      ? true
      : false;
  };

  return (
    <div className="flex gap-2">
      <IonButton
        size="small"
        fill="outline"
        className="p-0 m-0"
        disabled={isDownloadBtnDisabled()}
        onClick={async (e) => {
          await saveBooks([props.currentVid]);
        }}
      >
        {/* text always there */}
        {t(
          props.currentVid.savedSources?.video
            ? "videoAlreadySaved"
            : "saveThisVideo"
        )}
        {/* text + size*/}
        {!props.currentVid.savedSources?.video && <DownloadSize />}

        {props.currentWorkingVideoInfo &&
          props.currentWorkingVideoInfo.percentAlreadyDownloaded > 0 && (
            <PartiallyDownloadedSize />
          )}
      </IonButton>

      <IonButton
        size="small"
        fill="outline"
        className="p-0 m-0"
        disabled={
          getAlreadySavedInBook(props.currentBook).length ==
            props.currentBook.length || props.downloadProgress?.started
        }
        onClick={async (e) => await saveBooks(props.currentBook)}
      >
        {t(bookIsCompletelySaved() ? "bookAlreadySaved" : "saveThisBook")}
        <br />
        {!bookIsCompletelySaved() &&
          `${getDownloadSize({
            playlistSlug: props.playlistSlug,
            scope: props.currentBook,
            maxSigDigits: 3,
          })}`}
      </IonButton>
    </div>
  );
}
