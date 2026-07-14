import {
	IonButton,
	IonContent,
	IonHeader,
	IonIcon,
	IonModal,
	IonPage,
	IonTitle,
	IonToggle,
	IonToolbar,
} from "@ionic/react";
import { close, settingsOutline } from "ionicons/icons";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import brightCovePlaylistConfig from "../brightcove/playlist-mappers";
import { DotLogo, UsbIcon } from "../components/Icons";
import { useOfflineMode } from "../lib/offlineMode";
import { useUsbAccess } from "../lib/usbAccess";
import "./Home.css";

const Home: React.FC = () => {
	const { t } = useTranslation();
	const { isOffline, setIsOffline } = useOfflineMode();
	const { openUsbPicker } = useUsbAccess();
	const settingsModal = useRef<HTMLIonModalElement>(null);

	const alphabetizedByPlaylistDisplayName = Object.entries(
		brightCovePlaylistConfig,
	).sort((a, b) =>
		a[1].playlistDisplayName.localeCompare(b[1].playlistDisplayName),
	);

	return (
		<IonPage id="home-page">
			<IonHeader className="ion-no-border">
				<IonToolbar style={{ "--min-height": "auto" }}>
					<div className="flex content-center py-2 border border-b border-b-[#e1e1e1] relative">
						{/* USB button — top-left */}
						<IonButton
							shape="round"
							fill="clear"
							aria-label="Connect USB storage"
							onClick={() => openUsbPicker()}
							style={{
								position: "absolute",
								left: 4,
								top: "50%",
								transform: "translateY(-50%)",
								"--padding-start": 0,
								"--padding-end": 0,
								"--background-activated": "transparent",
							}}
						>
							<UsbIcon
								style={{ fontSize: "1.35rem", color: "var(--ion-color-dark)" }}
							/>
						</IonButton>

						<span className="w-44 block mx-auto">
							<a href="/">
								<DotLogo />
							</a>
						</span>

						{/* Settings button — top-right */}
						<IonButton
							id="home-settings-trigger"
							shape="round"
							fill="clear"
							style={{
								position: "absolute",
								right: 4,
								top: "50%",
								transform: "translateY(-50%)",
								"--padding-start": 0,
								"--padding-end": 0,
								"--background-activated": "transparent",
							}}
						>
							<IonIcon color="dark" slot="icon-only" icon={settingsOutline} />
						</IonButton>
					</div>
				</IonToolbar>
			</IonHeader>

			<IonContent fullscreen>
				{isOffline && (
					<div
						style={{
							background: "#f59e0b",
							color: "#fff",
							textAlign: "center",
							padding: "6px 12px",
							fontSize: "0.875rem",
							fontWeight: 600,
						}}
					>
						Offline Mode — network calls are disabled
					</div>
				)}
				<div className="px-5 max-w-[1200px] mx-auto">
					<h1 className="w-full text-center mt-10 mb-5 font-bold capitalize">
						{t("pickSignBible")}
					</h1>
					<ul
						data-testid="playlistsAvailable"
						className="flex flex-col gap-3 pb-12"
					>
						{alphabetizedByPlaylistDisplayName.map(([_key, value]) => {
							return (
								<li key={value.path} className="border-b-[#E9E9E9] border-b">
									<Link
										to={{ pathname: value.path, state: { routeInfo: value } }}
										className="py-4 block flex items-center w-full gap-3"
									>
										<img
											className="block w-8"
											src={`assets/flags/${value.flag}`}
											alt=""
										/>
										{value.display}
									</Link>
								</li>
							);
						})}
					</ul>
				</div>
			</IonContent>

			{/* Settings modal */}
			<IonModal
				ref={settingsModal}
				trigger="home-settings-trigger"
				className="grid place-content-end"
			>
				<div className="block p-5 relative" style={{ minHeight: 220 }}>
					<div className="w-full flex justify-between items-center mb-6">
						<IonTitle
							style={{ padding: 0, fontSize: "1.1rem", fontWeight: 700 }}
						>
							Settings
						</IonTitle>
						<IonButton
							fill="outline"
							size="small"
							shape="round"
							onClick={() => settingsModal.current?.dismiss()}
							style={{
								"--padding-start": "0",
								"--padding-end": "0",
								"--color": "#9c2921",
								"--border-color": "#9c2921",
							}}
						>
							<IonIcon slot="icon-only" icon={close} />
						</IonButton>
					</div>

					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							padding: "12px 0",
							borderBottom: "1px solid var(--ion-border-color, #e0e0e0)",
						}}
					>
						<div>
							<div style={{ fontWeight: 600 }}>Offline Mode</div>
							<div style={{ fontSize: "0.8rem", color: "#666", marginTop: 2 }}>
								Disable network calls; use local &amp; USB videos only
							</div>
						</div>
						<IonToggle
							checked={isOffline}
							onIonChange={(e) => setIsOffline(e.detail.checked)}
						/>
					</div>
				</div>
			</IonModal>
		</IonPage>
	);
};

export default Home;
