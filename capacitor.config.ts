import {CapacitorConfig} from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.slbible",
  appName: "DotMobile",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    buildOptions: {
      keystorePath:
        "/Users/willkelly/Documents/Work/Code_support_files/DotMobile/DotMobileKs",
      keystoreAlias: "key0",
    },
  },
};

export default config;
