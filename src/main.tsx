import { render } from "preact";
import App from "./App.tsx";
import "./styles.css";

render(<App />, document.body);

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((err) => {
        console.error("Service worker registration failed:", err);
      });
  });
}
