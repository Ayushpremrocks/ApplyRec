import React from 'react';
import styles from './ApplicationCard.module.css';
import { formatDate, formatDateTime, relativeTime, timeUntil } from '../utils/date';
import { STATUSES, STATUS_VAR, formatSalary, nextInterview, sourceLabel } from '../utils/applications';

const MAX_VISIBLE_TAGS = 3;

/** Stops pointer/touch events on controls from starting a card drag. */
const stopDrag = {
  onPointerDown: (e) => e.stopPropagation(),
  onMouseDown: (e) => e.stopPropagation(),
  onTouchStart: (e) => e.stopPropagation(),
};

function Icon({ d, size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS = {
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  archive: 'M4 7h16M5 7l1 13h12l1-13M9 11h6M3 4h18v3H3z',
  restore: 'M4 12a8 8 0 1 0 3-6.3M4 4v4h4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  link: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
};

/**
 * One application. Every action is available without drag-and-drop (status menu, buttons),
 * so the card works with touch, keyboard and screen readers.
 */
function ApplicationCard({
  application: app,
  onOpen,
  onEdit,
  onStatusChange,
  onArchive,
  onDelete,
  dragHandle,
  isDragging = false,
  now = Date.now(),
}) {
  const salary = formatSalary(app.salary);
  const source = sourceLabel(app);
  const upcoming = nextInterview(app, now);
  const tags = app.tags || [];
  const hiddenTags = tags.length - MAX_VISIBLE_TAGS;

  return (
    <article
      className={`${styles.card} ${app.follow_up ? styles.followUp : ''} ${isDragging ? styles.dragging : ''}`}
      style={{ '--status': STATUS_VAR[app.status] }}
      aria-label={`${app.company}, ${app.role}, ${app.status}`}
    >
      <div className={styles.top}>
        <button type="button" className={styles.title} onClick={() => onOpen(app)}>
          <span className={styles.company}>{app.company}</span>
          <span className={styles.role}>{app.role}</span>
        </button>
        {dragHandle}
      </div>

      <div className={styles.meta}>
        {salary && <span className={styles.salary}>{salary}</span>}
        {source && <span className={`${styles.chip} ${app.referral ? styles.referral : ''}`}>{source}</span>}
        {app.follow_up && <span className={`${styles.chip} ${styles.followChip}`}>Follow up</span>}
        {tags.slice(0, MAX_VISIBLE_TAGS).map((t) => (
          <span key={t} className={`${styles.chip} ${styles.tag}`}>
            #{t}
          </span>
        ))}
        {hiddenTags > 0 && <span className={`${styles.chip} ${styles.tag}`}>+{hiddenTags}</span>}
        {app.job_url && (
          <a
            className={`${styles.chip} ${styles.postLink}`}
            href={app.job_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${app.company} job posting`}
            {...stopDrag}
          >
            Job post
            <Icon d={ICONS.link} size={12} />
          </a>
        )}
      </div>

      {upcoming && (
        <p className={styles.interview} title={formatDateTime(upcoming.scheduled_at)}>
          <Icon d={ICONS.calendar} size={16} />
          <span>
            <strong>{upcoming.round}</strong> {timeUntil(upcoming.scheduled_at)} ·{' '}
            {formatDateTime(upcoming.scheduled_at)}
          </span>
        </p>
      )}

      <p className={styles.date} title={formatDate(app.applied_date)}>
        Applied {relativeTime(app.applied_date)}
      </p>

      <div className={styles.footer} {...stopDrag}>
        <label className={styles.statusLabel}>
          <span className="visually-hidden">Status of {app.company}</span>
          <select
            className={styles.status}
            value={app.status}
            onChange={(e) => onStatusChange(app, e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} onClick={() => onEdit(app)} aria-label={`Edit ${app.company}`} title="Edit">
            <Icon d={ICONS.edit} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => onArchive(app)}
            aria-label={`${app.archived ? 'Restore' : 'Archive'} ${app.company}`}
            title={app.archived ? 'Restore' : 'Archive'}
          >
            <Icon d={app.archived ? ICONS.restore : ICONS.archive} />
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.danger}`}
            onClick={() => onDelete(app)}
            aria-label={`Delete ${app.company}`}
            title="Delete"
          >
            <Icon d={ICONS.trash} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function DragHandleIcon() {
  return <Icon d={ICONS.grip} size={20} />;
}

export default ApplicationCard;
