import { createRoot } from "react-dom/client";
import App from "./App";
import { initInstallApp } from "./lib/install-app";
import "./index.css";

// Before rendering: Chrome's install prompt may come right after the page loads.
initInstallApp();

createRoot(document.getElementById("root")!).render(<App />);
