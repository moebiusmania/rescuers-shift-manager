import { useEffect, useState } from "preact/hooks";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "installPromptDismissedAt";
const DISMISS_DAYS = 14;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// iOS Safari never fires `beforeinstallprompt`; installing is manual there.
const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const wasRecentlyDismissed = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

const rememberDismissal = () => {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Storage unavailable: the prompt may show again next visit.
  }
};

const buttonStyle =
  "background:#1c2541;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;";
const secondaryButtonStyle =
  "background:transparent;color:#fff;border:1px solid #3a506b;padding:8px 12px;border-radius:8px;cursor:pointer;";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<
    BeforeInstallPromptEvent | null
  >(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return;

    if (isIos()) {
      setShowIosHint(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handler as EventListener,
      );
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || (!deferredPrompt && !showIosHint)) return null;

  const onInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "dismissed") rememberDismissal();
    } finally {
      // The event can only be used once; hide regardless of outcome.
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const onDismiss = () => {
    rememberDismissal();
    setVisible(false);
  };

  return (
    <div
      class="install-prompt"
      style="
        position: fixed;
        left: 50%;
        bottom: 20px;
        transform: translateX(-50%);
        width: max-content;
        max-width: calc(100vw - 32px);
        background: #0b132b;
        color: white;
        border-radius: 12px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.25);
        padding: 12px 16px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        z-index: 1000;
      "
      role="dialog"
      aria-label="Installa l'app"
    >
      {showIosHint
        ? (
          <>
            <span>
              Per installare "Shifts manager" tocca Condividi, poi "Aggiungi
              alla schermata Home".
            </span>
            <button
              type="button"
              class="button"
              style={buttonStyle}
              onClick={onDismiss}
            >
              Ho capito
            </button>
          </>
        )
        : (
          <>
            <span>Aggiungi "Shifts manager" alla schermata Home?</span>
            <button
              type="button"
              class="button"
              style={buttonStyle}
              onClick={onInstall}
            >
              Installa
            </button>
            <button
              type="button"
              class="button"
              style={secondaryButtonStyle}
              onClick={onDismiss}
            >
              Più tardi
            </button>
          </>
        )}
    </div>
  );
}
