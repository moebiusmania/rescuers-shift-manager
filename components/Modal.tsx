import type { ComponentChildren } from "preact";
import { useEffect } from "preact/hooks";

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children?: ComponentChildren;
  footer?: ComponentChildren;
}

export default function Modal(props: ModalProps) {
  const { open, title, onClose, children, footer } = props;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div class="modal">
      <div class="modal__backdrop" onClick={onClose} />
      <div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal__header">
          {title && <h3 id="modal-title" class="modal__title">{title}</h3>}
          <button type="button" class="modal__close button button--ghost" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </header>
        <div class="modal__body">
          {children}
        </div>
        {footer && <footer class="modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}


