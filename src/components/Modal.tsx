import type { ComponentChildren } from "preact";
import { useEffect, useId, useRef } from "preact/hooks";

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children?: ComponentChildren;
  footer?: ComponentChildren;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal(props: ModalProps) {
  const { open, title, onClose, children, footer } = props;
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Move focus into the dialog on open and restore it to the opener on close.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const initial = dialog?.querySelector<HTMLElement>("[autofocus]") ??
      dialog?.querySelector<HTMLElement>(`.modal__body ${FOCUSABLE}`) ??
      dialog;
    initial?.focus();
    return () => previouslyFocused?.focus?.();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      // Keep keyboard focus inside the dialog.
      if (event.key === "Tab" && dialogRef.current) {
        const items = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div class="modal">
      <div class="modal__backdrop" onClick={onClose} />
      <div
        class="modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        ref={dialogRef}
      >
        <header class="modal__header">
          {title && <h2 id={titleId} class="modal__title">{title}</h2>}
          <button type="button" class="modal__close button button--ghost" onClick={onClose} aria-label="Chiudi">
            <span aria-hidden="true">✕</span>
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
