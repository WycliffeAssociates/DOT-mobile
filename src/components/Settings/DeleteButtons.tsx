import {useTranslation} from "react-i18next";
import {
  IPlaylistData,
  IVidWithCustom,
  downloadProgressInfo,
  validPlaylistSlugs,
  vidInProgressInfo,
} from "../../customTypes/types";
import {IonButton} from "@ionic/react";
import {
  getAlreadySavedInBook,
  getCurrentPlaylistDataFs,
  updateStateFromFs,
} from "../../lib/Ui";
import {makeVidSaver} from "../../lib/storage";
import {Dispatch, SetStateAction} from "react";

type IDeleteButtonParams = {
  playlistSlug: validPlaylistSlugs;
  currentBook: IVidWithCustom[];
  currentVid: IVidWithCustom;
  setCurrentBook: Dispatch<SetStateAction<IVidWithCustom[]>>;
  setCurrentVid: Dispatch<SetStateAction<IVidWithCustom>>;
  setShapedPlaylist: Dispatch<SetStateAction<IPlaylistData | undefined>>;
  downloadProgress: downloadProgressInfo | undefined;
};
export function DeleteButtons(props: IDeleteButtonParams) {
  const {t} = useTranslation();

  function determineShowDeleteWholeBook() {
    const alreadySaved = getAlreadySavedInBook(props.currentBook);
    return (
      alreadySaved.length > 1 &&
      alreadySaved.some((vidSaved) => vidSaved.id != props.currentVid.id)
    );
  }

  async function deleteBooks(scope: IVidWithCustom[]) {
    for await (const vidChapter of scope) {
      const vidSaver = makeVidSaver(props.playlistSlug, vidChapter);
      const currentPlaylistData = await getCurrentPlaylistDataFs(
        props.playlistSlug
      );
      if (currentPlaylistData) {
        await vidSaver.deleteAllVidData(currentPlaylistData, vidChapter);
      }
    }

    await updateStateFromFs({
      playlistSlug: props.playlistSlug,
      vid: props.currentVid,
      setCurrentBook: props.setCurrentBook,
      setShapedPlaylist: props.setShapedPlaylist,
      setCurrentVid: props.setCurrentVid,
    });
  }

  return (
    <>
      {getAlreadySavedInBook(props.currentBook).length ? (
        <div data-name="deleteSection" className="mt-4">
          <h2 className="font-bold mb-2">{t("deleteOptions")}</h2>
          <div className="flex items-start gap-4">
            {props.currentVid.savedSources && (
              <div>
                <IonButton
                  size="small"
                  fill="outline"
                  className="p-0 m-0"
                  onClick={async (e) => {
                    await deleteBooks([props.currentVid]);
                  }}
                  disabled={props.downloadProgress?.started}
                >
                  {t("deleteThisVideo")}
                  <br />
                </IonButton>
              </div>
            )}
            {determineShowDeleteWholeBook() && (
              <div>
                {getAlreadySavedInBook(props.currentBook).length && (
                  <>
                    <IonButton
                      size="small"
                      fill="outline"
                      className="p-0 m-0 whitespace-normal"
                      onClick={(e) => deleteBooks(props.currentBook)}
                      disabled={props.downloadProgress?.started}
                    >
                      {t("deleteThisBook")}
                      <br />
                    </IonButton>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
