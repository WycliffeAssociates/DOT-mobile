import {downloadProgressInfo} from "../../customTypes/types";
import {IonProgressBar} from "@ionic/react";
type DownloadProgressParams = {
  downloadProgress: downloadProgressInfo | undefined;
};

export function DownloadProgress(props: DownloadProgressParams) {
  if (props.downloadProgress && props.downloadProgress.started) {
    return (
      <>
        <p>
          {props.downloadProgress.vidName} -{" "}
          {new Intl.NumberFormat(navigator.languages[0], {
            style: "percent",
            maximumFractionDigits: 0,
          }).format(props.downloadProgress.amount)}
        </p>
        <IonProgressBar
          value={props.downloadProgress.amount}
          buffer={100}
        ></IonProgressBar>
      </>
    );
  } else return null;
}
