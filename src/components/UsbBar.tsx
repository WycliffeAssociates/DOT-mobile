import { Preferences } from "@capacitor/preferences";
import { IonButton, IonIcon } from "@ionic/react";
import { folderOpenOutline } from "ionicons/icons";
import { useEffect, useState } from "react";
import { UsbStorage } from "../plugins/UsbStorage";

const USB_URI_KEY = "usbTreeUri";

export function UsbBar() {
	const [hasAccess, setHasAccess] = useState(false);

	useEffect(() => {
		Preferences.get({ key: USB_URI_KEY }).then(({ value }) => {
			if (value) setHasAccess(true);
		});
	}, []);

	const handleOpenSaf = async () => {
		try {
			const { uri } = await UsbStorage.requestDirectoryAccess();
			await Preferences.set({ key: USB_URI_KEY, value: uri });
			setHasAccess(true);
		} catch {
			// user cancelled — no-op
		}
	};

	return (
		<div
			style={{
				position: "fixed",
				bottom: 0,
				left: 0,
				right: 0,
				zIndex: 1000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "6px 16px",
				background: "var(--ion-background-color, #fff)",
				borderTop: "1px solid rgba(0,0,0,0.12)",
			}}
		>
			<IonButton fill="outline" size="small" onClick={handleOpenSaf}>
				<IonIcon slot="start" icon={folderOpenOutline} />
				{hasAccess ? "Change USB Folder" : "Connect USB Videos"}
			</IonButton>
		</div>
	);
}
