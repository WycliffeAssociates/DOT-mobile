import React from "react";
import {createRoot} from "react-dom/client";
import App from "./App";
import "./i18n/i18nnext";
import "virtual:uno.css";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  // <React.StrictMode>
  <App />
  // {/* </React.StrictMode> */}
);
// root.render(<App />);
