// Import CSS files here for hot module reloading to work.
import "./assets/styles.css";

// Register Service Worker for PWA
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });
}
