import { Preferences } from "@capacitor/preferences";
import {
	IonApp,
	IonRouterOutlet,
	setupIonicReact,
	useIonAlert,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { useEffect, useRef } from "react";
import { Route } from "react-router-dom";
import brightCovePlaylistConfig from "./brightcove/playlist-mappers";
import Home from "./pages/Home";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

// User css
import "@unocss/reset/tailwind.css";
import "./theme/global.css";
import "./theme/variables.css";

import Playlist from "./pages/Playlist";
import { UsbStorage } from "./plugins/UsbStorage";

setupIonicReact();

const USB_URI_KEY = "usbTreeUri";

function App() {
	const [presentAlert, dismissAlert] = useIonAlert();
	// Tracks whether we've already shown the dialog for the current USB connection.
	// Using a ref so it doesn't trigger re-renders and is accessible inside the effect.
	const hasPromptedRef = useRef(false);

	useEffect(() => {
		// Clear any stale SAF permission from a previous session so we never
		// hold a URI that may be invalid for the currently-attached drive.
		Preferences.remove({ key: USB_URI_KEY });

		const showUsbDialog = () => {
			if (hasPromptedRef.current) return;
			hasPromptedRef.current = true;

			presentAlert({
				header: "USB Drive Detected",
				message:
					"Would you like to open DOT videos from the connected USB drive?",
				buttons: [
					{ text: "No", role: "cancel" },
					{
						text: "Yes",
						handler: () => {
							// Run async work outside the handler so Ionic doesn't
							// wait on the promise before dismissing the dialog.
							(async () => {
								try {
									const { uri, folders } =
										await UsbStorage.requestDirectoryAccess();

									// Cross-reference the root folders on the drive
									// against every known playlist slug.
									const matchedEntries = Object.values(
										brightCovePlaylistConfig,
									).filter((e) => folders.includes(e.playlist));

									if (matchedEntries.length > 0) {
										// Valid drive — save the URI and tell the user what was found.
										await Preferences.set({
											key: USB_URI_KEY,
											value: uri,
										});
										const languageList = matchedEntries
											.map((e) => e.display)
											.join(", ");
										presentAlert({
											header: "USB Drive Ready",
											message: `Found ${matchedEntries.length} language(s): ${languageList}`,
											buttons: ["OK"],
										});
									} else {
										// No recognised playlist folders — ask to retry.
										presentAlert({
											header: "No DOT Videos Found",
											message:
												"The selected folder doesn't contain any recognised DOT language folders. Would you like to choose a different folder?",
											buttons: [
												{ text: "Cancel", role: "cancel" },
												{
													text: "Try Again",
													handler: () => {
														(async () => {
															try {
																const { uri: retryUri, folders: retryFolders } =
																	await UsbStorage.requestDirectoryAccess();
																const retryMatches = Object.values(
																	brightCovePlaylistConfig,
																).filter((e) =>
																	retryFolders.includes(e.playlist),
																);
																if (retryMatches.length > 0) {
																	await Preferences.set({
																		key: USB_URI_KEY,
																		value: retryUri,
																	});
																	const list = retryMatches
																		.map((e) => e.display)
																		.join(", ");
																	presentAlert({
																		header: "USB Drive Ready",
																		message: `Found ${retryMatches.length} language(s): ${list}`,
																		buttons: ["OK"],
																	});
																} else {
																	presentAlert({
																		header: "No DOT Videos Found",
																		message:
																			"Still no recognised DOT language folders in the selected location.",
																		buttons: ["OK"],
																	});
																}
															} catch {
																// user cancelled retry SAF picker
															}
														})();
													},
												},
											],
										});
									}
								} catch {
									// user cancelled the SAF picker — no-op
								}
							})();
						},
					},
				],
			});
		};

		// If a USB drive is already connected when the app opens, show the dialog.
		UsbStorage.checkUsbConnected()
			.then(({ connected }) => {
				if (connected) showUsbDialog();
			})
			.catch(() => {
				// plugin unavailable on this platform — ignore
			});

		// Listen for future plug/unplug events.
		let listenerHandle: { remove: () => void } | null = null;
		UsbStorage.addListener("usbStateChange", (data) => {
			if (data.status === "mounted") {
				showUsbDialog();
			} else {
				// Drive removed — dismiss the dialog if it's open, clear saved access,
				// and allow the dialog to show again next time a drive is connected.
				dismissAlert();
				hasPromptedRef.current = false;
				Preferences.remove({ key: USB_URI_KEY });
			}
		}).then((handle) => {
			listenerHandle = handle;
		});

		return () => {
			listenerHandle?.remove();
		};
	}, [presentAlert, dismissAlert]);

	return (
		// @ts-ignore
		<IonApp>
			<IonReactRouter>
				<IonRouterOutlet>
					<Route path="/" exact={true}>
						<Home />
					</Route>
					<Route path="/:playlist">
						<Playlist />
					</Route>
				</IonRouterOutlet>
			</IonReactRouter>
		</IonApp>
	);
}

export default App;
