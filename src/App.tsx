import { Preferences } from "@capacitor/preferences";
import {
	IonApp,
	IonRouterOutlet,
	setupIonicReact,
	useIonAlert,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { useEffect, useRef, useState } from "react";
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

import { UsbCopyModal } from "./components/UsbCopyModal";
import { OfflineModeProvider } from "./lib/offlineMode";
import Playlist from "./pages/Playlist";
import { UsbStorage } from "./plugins/UsbStorage";

setupIonicReact();

const USB_URI_KEY = "usbTreeUri";

function App() {
	const [presentAlert, dismissAlert] = useIonAlert();
	const hasPromptedRef = useRef(false);
	const [copyModal, setCopyModal] = useState<{
		isOpen: boolean;
		treeUri: string;
		matchedEntries: { playlist: string; display: string }[];
	}>({ isOpen: false, treeUri: "", matchedEntries: [] });

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
							(async () => {
								try {
									const { uri, folders } =
										await UsbStorage.requestDirectoryAccess();

									const matched = Object.values(
										brightCovePlaylistConfig,
									).filter((e) => folders.includes(e.playlist));

									if (matched.length > 0) {
										await Preferences.set({ key: USB_URI_KEY, value: uri });
										presentAlert({
											header: "USB Drive Ready",
											message: `Found ${matched.length} language(s): ${matched.map((e) => e.display).join(", ")}`,
											inputs: [
												{
													type: "checkbox" as const,
													label: "Copy videos to device for offline use",
													value: "copy",
													checked: false,
												},
											],
											buttons: [
												{
													text: "OK",
													handler: (selected: string[]) => {
														if (selected.includes("copy")) {
															setCopyModal({
																isOpen: true,
																treeUri: uri,
																matchedEntries: matched,
															});
														}
													},
												},
											],
										});
									} else {
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
																const retryMatched = Object.values(
																	brightCovePlaylistConfig,
																).filter((e) =>
																	retryFolders.includes(e.playlist),
																);
																if (retryMatched.length > 0) {
																	await Preferences.set({
																		key: USB_URI_KEY,
																		value: retryUri,
																	});
																	presentAlert({
																		header: "USB Drive Ready",
																		message: `Found ${retryMatched.length} language(s): ${retryMatched.map((e) => e.display).join(", ")}`,
																		inputs: [
																			{
																				type: "checkbox" as const,
																				label:
																					"Copy videos to device for offline use",
																				value: "copy",
																				checked: false,
																			},
																		],
																		buttons: [
																			{
																				text: "OK",
																				handler: (selected: string[]) => {
																					if (selected.includes("copy")) {
																						setCopyModal({
																							isOpen: true,
																							treeUri: retryUri,
																							matchedEntries: retryMatched,
																						});
																					}
																				},
																			},
																		],
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
																// user cancelled retry
															}
														})();
													},
												},
											],
										});
									}
								} catch {
									// user cancelled SAF picker
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
			<OfflineModeProvider>
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

				<UsbCopyModal
					isOpen={copyModal.isOpen}
					treeUri={copyModal.treeUri}
					matchedEntries={copyModal.matchedEntries}
					onClose={() => setCopyModal((s) => ({ ...s, isOpen: false }))}
					onCopyDone={(count) => {
						setCopyModal((s) => ({ ...s, isOpen: false }));
						presentAlert({
							header: "Copy Complete",
							message: `${count} video${count !== 1 ? "s" : ""} copied to device storage.`,
							buttons: ["OK"],
						});
					}}
				/>
			</OfflineModeProvider>
		</IonApp>
	);
}

export default App;
