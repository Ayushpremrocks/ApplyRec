import React from 'react';
import styles from './Skeleton.module.css';

export function SkeletonBlock({ width = '100%', height = 14, radius = 6, className = '' }) {
  return <span className={`${styles.block} ${className}`} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

/** Placeholder shaped like the dashboard while applications load. */
export function DashboardSkeleton() {
  return (
    <div className={styles.wrap} role="status" aria-label="Loading applications">
      <div className={styles.stats}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={styles.stat}>
            <SkeletonBlock width="40%" height={26} />
            <SkeletonBlock width="70%" height={12} />
          </div>
        ))}
      </div>
      <SkeletonBlock height={44} radius={10} />
      <div className={styles.columns}>
        {Array.from({ length: 4 }, (_, c) => (
          <div key={c} className={styles.column}>
            <SkeletonBlock width="50%" height={16} />
            {Array.from({ length: 3 - (c % 2) }, (_, i) => (
              <div key={i} className={styles.card}>
                <SkeletonBlock width="65%" height={16} />
                <SkeletonBlock width="45%" height={12} />
                <SkeletonBlock width="30%" height={12} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
