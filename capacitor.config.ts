import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "com.slbible.dotapp",
	appName: "Sign Language Bibles",
	webDir: "dist",
	server: {
		androidScheme: "https",
	},
	android: {
		buildOptions: {},
	},
};

export default config;
