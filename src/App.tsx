import {
	IonApp,
	IonRouterOutlet,
	setupIonicReact,
	useIonToast,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { useEffect } from "react";
import { Route } from "react-router-dom";
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

import { UsbBar } from "./components/UsbBar";
import Playlist from "./pages/Playlist";
import { UsbStorage } from "./plugins/UsbStorage";

setupIonicReact();

function App() {
	const [presentToast] = useIonToast();

	useEffect(() => {
		let listenerHandle: { remove: () => void } | null = null;

		UsbStorage.addListener("usbStateChange", (data) => {
			presentToast({
				message:
					data.status === "mounted"
						? "USB drive connected"
						: "USB drive removed",
				duration: 3000,
				position: "bottom",
			});
		}).then((handle) => {
			listenerHandle = handle;
		});

		return () => {
			listenerHandle?.remove();
		};
	}, [presentToast]);

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
			<UsbBar />
		</IonApp>
	);
}

export default App;
