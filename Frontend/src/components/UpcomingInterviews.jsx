import React from 'react';
import styles from './UpcomingInterviews.module.css';
import { formatDateTime, timeUntil } from '../utils/date';
import { upcomingInterviews } from '../utils/applications';

/** The next few interviews (14 days) across all active applications. */
function UpcomingInterviews({ applications, onOpen, now = Date.now() }) {
  const items = upcomingInterviews(applications, now).slice(0, 4);
  if (items.length === 0) return null;

  return (
    <section className={styles.panel} aria-labelledby="upcoming-heading">
      <h2 id="upcoming-heading" className={styles.heading}>
        Upcoming interviews
      </h2>
      <ul className={styles.list}>
        {items.map(({ interview, application }) => {
          const soon = new Date(interview.scheduled_at) - now < 24 * 60 * 60 * 1000;
          return (
            <li key={interview.id}>
              <button type="button" className={`${styles.item} ${soon ? styles.soon : ''}`} onClick={() => onOpen(application)}>
                <span className={styles.when}>{timeUntil(interview.scheduled_at, new Date(now))}</span>
                <span className={styles.what}>
                  <strong>{application.company}</strong> · {interview.round}
                </span>
                <span className={styles.time}>{formatDateTime(interview.scheduled_at)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default UpcomingInterviews;
