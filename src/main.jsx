import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { initAppTheme } from "./appTheme";
import { initPrefsSync } from "./services/prefsSync";
import "./index.css";

initAppTheme();
initPrefsSync();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
    <Analytics />
    <SpeedInsights />
  </StrictMode>
);