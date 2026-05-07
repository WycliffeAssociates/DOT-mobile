import { registerPlugin } from "@capacitor/core";

export interface UsbStoragePlugin {
	addListener(
		eventName: "usbStateChange",
		listenerFunc: (data: {
			status: "mounted" | "removed";
			path?: string;
		}) => void,
	): Promise<{ remove: () => void }>;

	requestDirectoryAccess(): Promise<{ uri: string; folders: string[] }>;

	/** Returns true if any USB device is currently connected. */
	checkUsbConnected(): Promise<{ connected: boolean }>;

	/** Returns the content:// URI for a specific chapter video on the USB drive,
	 *  plus a localhost URL that can be set directly as a video src. */
	getPlayableUri(options: {
		treeUri: string;
		playlist: string;
		book: string;
		chapter: string;
	}): Promise<{ uri: string; playableUrl: string }>;

	/** Lists all {book, chapter} pairs that have .mp4 files for the given playlist. */
	scanAvailableVideos(options: {
		treeUri: string;
		playlist: string;
	}): Promise<{ videos: Array<{ book: string; chapter: string }> }>;

	/**
	 * Copies all .mp4 files for a playlist from the USB drive into the app's
	 * internal Documents directory at {playlist}/{book}/{chapter}.mp4.
	 * Runs on a native background thread; resolves when all files are done.
	 */
	copyUsbPlaylist(options: {
		treeUri: string;
		playlist: string;
	}): Promise<{ ok: boolean; filesCopied: number }>;

	/**
	 * Copies specific book/chapter combinations from a playlist on the USB drive
	 * into app-private external storage. Runs on a native background thread.
	 */
	copyUsbChapters(options: {
		treeUri: string;
		playlist: string;
		items: Array<{ book: string; chapter: string }>;
	}): Promise<{ filesCopied: number }>;

	/**
	 * Checks whether a local copy exists for the given playlist/book/chapter
	 * (written by copyUsbPlaylist) and returns a _capacitor_file_ playable URL.
	 * Rejects if the file is not found.
	 */
	getLocalCopyUrl(options: {
		playlist: string;
		book: string;
		chapter: string;
	}): Promise<{ playableUrl: string }>;
}

const UsbStorage = registerPlugin<UsbStoragePlugin>("UsbStorage");

export { UsbStorage };
