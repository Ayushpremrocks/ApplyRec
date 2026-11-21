import React from 'react';
import styles from './ApplicationCard.module.css';
import Button from './Button';
import { formatDate, relativeTime } from '../utils/date';
import { formatSalary, hasValue } from '../utils/applications';

function ApplicationCard({ application, onEdit, onDelete }) {
  const statusClass = styles[application.status.toLowerCase()] || styles.default;

  return (
    <div className={`${styles.card} ${application.follow_up ? styles.followUpCard : ''}`}>
      <div className={styles.header}>
        <h3 className={styles.company}>{application.company}</h3>
        <span className={`${styles.status} ${statusClass}`}>{application.status}</span>
      </div>

      {application.job_id && <p className={styles.jobId}>ID: {application.job_id}</p>}

      <p className={styles.role}>{application.role}</p>

      {hasValue(application.salary) && (
        <p className={styles.salary}>{formatSalary(application.salary)}</p>
      )}

      <div className={styles.dates}>
        <p className={styles.date} title={formatDate(application.applied_date)}>
          Applied {relativeTime(application.applied_date)}
        </p>
        {application.status_updated_at && (
          <p className={styles.dateSmall} title={formatDate(application.status_updated_at)}>
            Status updated {relativeTime(application.status_updated_at)}
          </p>
        )}
      </div>

      {application.notes && (
        <div className={styles.notes}>
          <p className={styles.notesText}>{application.notes}</p>
        </div>
      )}

      {application.follow_up && <div className={styles.followUpBadge}>Follow Up Required</div>}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => onEdit(application)}>
          Edit
        </Button>
        <Button variant="danger" onClick={() => onDelete(application.id)}>
          Delete
        </Button>
      </div>
    </div>
  );
}

export default ApplicationCard;
