import "virtual:uno.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./i18n/i18nnext";

const container = document.getElementById("root");

// biome-ignore lint/style/noNonNullAssertion: <index html not touched>
const root = createRoot(container!);
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
