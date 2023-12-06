import { IVidWithCustom, validPlaylistSlugs } from "../customTypes/types";
import { formatPlayListName, normalizeBookName } from "../lib/utils";
type IPlaylistInfo = {
	currentVid: IVidWithCustom;
	playlist: validPlaylistSlugs;
};
export function PlaylistInfo({ currentVid, playlist }: IPlaylistInfo) {
	return (
		<div data-title="BookAndPlaylistName" className={"px-3 sm:(py-4)"}>
			<h1 data-testid="bookPicked" className="font-bold">
				{" "}
				{normalizeBookName(currentVid?.localizedBookName || currentVid.book)}
			</h1>
			<p>{formatPlayListName(playlist)}</p>
		</div>
	);
}
