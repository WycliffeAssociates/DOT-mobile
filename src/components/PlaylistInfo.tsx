import {normalizeBookName, formatPlayListName} from "../lib/utils";
import {IVidWithCustom, validPlaylistSlugs} from "../customTypes/types";
type IPlaylistInfo = {
  currentVid: IVidWithCustom;
  playlist: validPlaylistSlugs;
};
export function PlaylistInfo({currentVid, playlist}: IPlaylistInfo) {
  return (
    <div data-title="BookAndPlaylistName" className={`px-3 sm:(py-4)`}>
      <h1 className="font-bold">
        {" "}
        {normalizeBookName(currentVid?.localizedBookName || currentVid.book)}
      </h1>
      <p>{formatPlayListName(playlist)}</p>
    </div>
  );
}
