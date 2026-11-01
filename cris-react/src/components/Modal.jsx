import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/* Accessible modal: portal to <body>, ESC to close, click the backdrop to
   cancel, focus lands on the first field, Tab cycles inside the dialog,
   body scroll locked and focus returned to the trigger on close.
   Children are rendered as direct hits of the backdrop so the CSS grid
   centering applies to the card itself. */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function Modal({ open, onClose, className = "modal", children }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const opener = document.activeElement;

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !boxRef.current) return;

      /* keep Tab inside the dialog — otherwise focus walks into the page
         behind it and the "modal" is only visual */
      const items = Array.from(boxRef.current.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !boxRef.current.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const firstField = boxRef.current && boxRef.current.querySelector("input,textarea,select,button");
    if (firstField) firstField.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      if (opener && typeof opener.focus === "function") opener.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={className}
      ref={boxRef}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>,
    document.body
  );
}
