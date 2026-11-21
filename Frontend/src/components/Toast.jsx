import React, { useEffect } from 'react';
import styles from './Toast.module.css';

const DEFAULT_ICONS = { success: '✓', error: '✕' };

function Toast({ message, type = 'success', icon, celebration = false, onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`${styles.toast} ${styles[type] || ''} ${celebration ? styles.celebration : ''}`}
    >
      <span className={styles.icon}>{icon || DEFAULT_ICONS[type] || DEFAULT_ICONS.success}</span>
      <span className={styles.message}>{message}</span>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

export default Toast;
