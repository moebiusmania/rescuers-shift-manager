import { useEffect, useState } from "preact/hooks";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<
    BeforeInstallPromptEvent | null
  >(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handler as EventListener,
      );
    };
  }, []);

  if (!visible || !deferredPrompt) return null;

  const onInstall = async () => {
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      // Hide regardless of outcome
      setVisible(false);
      setDeferredPrompt(null);
      // Optional: analytics or toast based on choice.outcome
    } catch {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const onDismiss = () => {
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
        background: #0b132b;
        color: white;
        border-radius: 12px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.25);
        padding: 12px 16px;
        display: flex;
        gap: 8px;
        align-items: center;
        z-index: 1000;
      "
      role="dialog"
      aria-label="Install app"
    >
      <span>Aggiungi "Shifts manager" alla schermata Home?</span>
      <button
        type="button"
        class="button"
        style="background:#1c2541;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;"
        onClick={onInstall}
      >
        Installa
      </button>
      <button
        type="button"
        class="button"
        style="background:transparent;color:#fff;border:1px solid #3a506b;padding:8px 12px;border-radius:8px;cursor:pointer;"
        onClick={onDismiss}
      >
        Più tardi
      </button>
    </div>
  );
}
