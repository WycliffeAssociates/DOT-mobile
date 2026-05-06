import { registerPlugin } from "@capacitor/core";

export interface UsbStoragePlugin {
	addListener(
		eventName: "usbStateChange",
		listenerFunc: (data: {
			status: "mounted" | "removed";
			path?: string;
		}) => void,
	): Promise<{ remove: () => void }>;

	requestDirectoryAccess(): Promise<{ uri: string }>;

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
}

const UsbStorage = registerPlugin<UsbStoragePlugin>("UsbStorage");

export { UsbStorage };
