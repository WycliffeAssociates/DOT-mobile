import { Preferences } from "@capacitor/preferences";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

const OFFLINE_KEY = "offlineMode";

type OfflineModeContextType = {
	isOffline: boolean;
	setIsOffline: (val: boolean) => void;
};

export const OfflineModeContext = createContext<OfflineModeContextType>({
	isOffline: false,
	setIsOffline: () => {},
});

export function useOfflineMode() {
	return useContext(OfflineModeContext);
}

export function OfflineModeProvider({ children }: { children: ReactNode }) {
	const [isOffline, setIsOfflineState] = useState(false);

	useEffect(() => {
		Preferences.get({ key: OFFLINE_KEY }).then(({ value }) => {
			if (value === "true") setIsOfflineState(true);
		});
	}, []);

	function setIsOffline(val: boolean) {
		setIsOfflineState(val);
		Preferences.set({ key: OFFLINE_KEY, value: String(val) });
	}

	return (
		<OfflineModeContext.Provider value={{ isOffline, setIsOffline }}>
			{children}
		</OfflineModeContext.Provider>
	);
}
