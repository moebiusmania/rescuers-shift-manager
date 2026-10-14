import { render } from "preact";
import App from "./App.tsx";
import "./fonts/inter.css";
import "./styles.css";

render(<App />, document.body);

// Register Service Worker for PWA (production only, so dev isn't served stale
// files from the cache)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((err) => {
        console.error("Service worker registration failed:", err);
      });
  });
}
