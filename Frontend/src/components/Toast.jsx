import React, { useEffect, useRef } from 'react';
import styles from './Toast.module.css';

const DEFAULT_ICONS = { success: '✓', error: '✕', info: 'i' };

/**
 * A single notification. With `action` ({ label, onClick }) it shows a button such as
 * "Undo". The timer pauses while the pointer or keyboard focus is on the toast.
 */
function Toast({ message, type = 'success', icon, celebration = false, action, onClose, duration = 4000 }) {
  const timer = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const start = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onCloseRef.current(), duration);
  };
  const stop = () => clearTimeout(timer.current);

  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`${styles.toast} ${styles[type] || ''} ${celebration ? styles.celebration : ''}`}
      onMouseEnter={stop}
      onMouseLeave={start}
      onFocus={stop}
      onBlur={start}
    >
      <span className={styles.icon} aria-hidden="true">
        {icon || DEFAULT_ICONS[type] || DEFAULT_ICONS.success}
      </span>
      <span className={styles.message}>{message}</span>
      {action && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            action.onClick();
            onClose();
          }}
        >
          {action.label}
        </button>
      )}
      <button type="button" className={styles.close} onClick={onClose} aria-label="Dismiss notification">
        ×
      </button>
    </div>
  );
}

export default Toast;
