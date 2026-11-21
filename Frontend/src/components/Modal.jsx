import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openCount = 0;

/**
 * Accessible dialog: focus moves inside and is trapped there, Escape and the backdrop close
 * it, focus returns to the opener on close, and the page behind does not scroll.
 * variant "dialog" is centred; "sheet" slides in from the right (full-screen on phones).
 */
function Modal({ title, onClose, children, footer, variant = 'dialog', size = 'md', closeOnBackdrop = true, hideTitle = false }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement;
    const panel = panelRef.current;
    const first = panel.querySelector('[data-autofocus]') || panel.querySelector(FOCUSABLE) || panel;
    first.focus({ preventScroll: true });

    openCount += 1;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    panel.addEventListener('keydown', onKeyDown);

    return () => {
      panel.removeEventListener('keydown', onKeyDown);
      openCount -= 1;
      if (openCount === 0) document.body.style.overflow = '';
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
        opener.focus({ preventScroll: true });
      }
    };
  }, []);

  return createPortal(
    <div
      className={`${styles.backdrop} ${styles[variant]}`}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`${styles.panel} ${styles[`panel-${variant}`]} ${styles[`size-${size}`]}`}
      >
        <header className={`${styles.header} ${hideTitle ? styles.headerBare : ''}`}>
          <h2 id={titleId} className={hideTitle ? 'visually-hidden' : styles.title}>
            {title}
          </h2>
          {onClose && (
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
