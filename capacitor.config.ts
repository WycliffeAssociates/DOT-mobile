import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "com.slbible",
	appName: "WA Sign Bibles",
	webDir: "dist",
	server: {
		androidScheme: "https",
	},
	android: {
		buildOptions: {},
	},
};

export default config;
