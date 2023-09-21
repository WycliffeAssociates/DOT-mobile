// uno.config.ts
import {defineConfig} from "unocss";
import presetUno from "unocss/preset-uno";
import {presetMini} from "unocss";
import {transformerDirectives, transformerVariantGroup} from "unocss";

export default defineConfig({
  // ...UnoCSS options
  theme: {
    colors: {
      base: "rgb(var(--ion-color-light-rgb))",
      surface: "rgb(var(--ion-color-dark-rgb))",
      primary: "rgb(var(--ion-color-primary-rgb))",
    },
  },
  transformers: [transformerDirectives(), transformerVariantGroup()],
  presets: [
    presetMini({
      dark: "media",
    }),
    presetUno(),
  ],
  rules: [
    [
      /^grid-col-fill-(\d+)$/,
      ([, d]) => ({
        "grid-template-columns": `repeat( auto-fit, minmax(${d}px, 1fr) );`,
      }),
    ],
    [
      /^scrollbar-hide$/,
      ([_]) => {
        return `.scrollbar-hide{scrollbar-width:none}
.scrollbar-hide::-webkit-scrollbar{display:none}`;
      },
    ],
    [
      /^scrollbar-default$/,
      ([_]) => {
        return `.scrollbar-default{scrollbar-width:auto}
.scrollbar-default::-webkit-scrollbar{display:block}`;
      },
    ],
  ],
});
