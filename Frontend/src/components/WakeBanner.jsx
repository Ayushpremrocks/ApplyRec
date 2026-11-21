import React, { useEffect, useState } from 'react';
import { isServerWaking, subscribeServerWaking } from '../services/api';
import styles from './WakeBanner.module.css';

/** Shown while any request is unusually slow, i.e. the free-tier server is starting. */
function WakeBanner() {
  const [waking, setWaking] = useState(isServerWaking);

  useEffect(() => subscribeServerWaking(setWaking), []);

  if (!waking) return null;
  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>
        <strong>Waking up the server…</strong> The free plan sleeps when idle, so the first request can take
        up to a minute.
      </span>
    </div>
  );
}

export default WakeBanner;
