import {CapacitorConfig} from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.slbible",
  appName: "DotMobile",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
