import { createContext, useContext } from "react";

type UsbAccessContextType = {
	/** Opens the USB folder picker and runs the full access / copy flow. */
	openUsbPicker: () => void;
};

export const UsbAccessContext = createContext<UsbAccessContextType>({
	openUsbPicker: () => {},
});

export function useUsbAccess() {
	return useContext(UsbAccessContext);
}
