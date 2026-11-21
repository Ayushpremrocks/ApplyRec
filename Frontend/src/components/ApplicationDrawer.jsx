import React, { useState } from 'react';
import styles from './ApplicationDrawer.module.css';
import Modal from './Modal';
import Button from './Button';
import InterviewForm from './InterviewForm';
import { useHistoryQuery } from '../hooks/useApplications';
import { toInterviewPayload } from '../services/applicationService';
import { STATUS_VAR, formatSalary, sourceLabel } from '../utils/applications';
import { formatDate, formatDateTime, timeUntil } from '../utils/date';

function Timeline({ applicationId }) {
  const { data: history, isLoading, isError, refetch } = useHistoryQuery(applicationId);

  if (isLoading) return <p className={styles.muted}>Loading timeline…</p>;
  if (isError)
    return (
      <p className={styles.muted}>
        Couldn't load the timeline.{' '}
        <button type="button" className={styles.linkButton} onClick={() => refetch()}>
          Retry
        </button>
      </p>
    );
  if (!history?.length) return <p className={styles.muted}>No status changes yet.</p>;

  return (
    <ol className={styles.timeline}>
      {[...history].reverse().map((h, i, list) => {
        const previous = list[i + 1];
        const days = previous ? Math.round((new Date(h.changed_at) - new Date(previous.changed_at)) / 86400000) : null;
        return (
          <li key={h.id} className={styles.event} style={{ '--status': STATUS_VAR[h.to_status] }}>
            <span className={styles.eventDot} aria-hidden="true" />
            <div>
              <p className={styles.eventTitle}>
                {h.from_status ? (
                  <>
                    {h.from_status} <span aria-hidden="true">→</span>
                    <span className="visually-hidden">to</span> <strong>{h.to_status}</strong>
                  </>
                ) : (
                  <>
                    Added as <strong>{h.to_status}</strong>
                  </>
                )}
              </p>
              <p className={styles.eventTime}>
                {formatDateTime(h.changed_at)}
                {days !== null && days > 0 && ` · ${days} day${days === 1 ? '' : 's'} later`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Side sheet with everything about one application: details, interviews and timeline. */
function ApplicationDrawer({ application: app, onClose, onEdit, actions, notify }) {
  const [editing, setEditing] = useState(null); // null | 'new' | interview
  const [saving, setSaving] = useState(false);
  const now = Date.now();
  const salary = formatSalary(app.salary);
  const source = sourceLabel(app);

  const saveInterview = async (form) => {
    setSaving(true);
    try {
      const payload = toInterviewPayload(form);
      if (editing === 'new') {
        await actions.addInterview(app.id, payload);
        notify('Interview scheduled', { icon: '📅' });
      } else {
        await actions.updateInterview(app.id, editing.id, payload);
        notify('Interview updated');
      }
      setEditing(null);
    } catch (err) {
      notify(err.message || 'Could not save the interview', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const removeInterview = async (interview) => {
    try {
      await actions.deleteInterview(app.id, interview.id);
      notify('Interview removed');
    } catch (err) {
      notify(err.message || 'Could not remove the interview', { type: 'error' });
    }
  };

  return (
    <Modal
      variant="sheet"
      title={app.company}
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={() => onEdit(app)}>
          Edit details
        </Button>
      }
    >
      <div className={styles.content}>
        <section className={styles.summary} style={{ '--status': STATUS_VAR[app.status] }}>
          <p className={styles.role}>{app.role}</p>
          <div className={styles.badges}>
            <span className={styles.status}>{app.status}</span>
            {app.archived && <span className={styles.badge}>Archived</span>}
            {source && <span className={styles.badge}>{source}</span>}
            {app.follow_up && <span className={`${styles.badge} ${styles.warn}`}>Follow up</span>}
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>Applied</dt>
              <dd>{formatDate(app.applied_date)}</dd>
            </div>
            <div>
              <dt>Salary</dt>
              <dd>{salary || '—'}</dd>
            </div>
            {app.job_id && (
              <div>
                <dt>Job ID</dt>
                <dd className={styles.mono}>{app.job_id}</dd>
              </div>
            )}
          </dl>
          {app.job_url && (
            <a className={styles.postingLink} href={app.job_url} target="_blank" rel="noopener noreferrer">
              Open job posting ↗
            </a>
          )}
          {app.tags?.length > 0 && (
            <ul className={styles.tags} aria-label="Tags">
              {app.tags.map((t) => (
                <li key={t}>#{t}</li>
              ))}
            </ul>
          )}
          {app.notes && <p className={styles.notes}>{app.notes}</p>}
        </section>

        <section aria-labelledby="interviews-heading">
          <div className={styles.sectionHeader}>
            <h3 id="interviews-heading">Interviews</h3>
            {editing === null && (
              <Button size="sm" variant="secondary" onClick={() => setEditing('new')}>
                + Schedule
              </Button>
            )}
          </div>
          {editing === 'new' && <InterviewForm onSave={saveInterview} onCancel={() => setEditing(null)} saving={saving} />}
          {app.interviews?.length ? (
            <ul className={styles.interviews}>
              {app.interviews.map((iv) =>
                editing && editing !== 'new' && editing.id === iv.id ? (
                  <li key={iv.id}>
                    <InterviewForm interview={iv} onSave={saveInterview} onCancel={() => setEditing(null)} saving={saving} />
                  </li>
                ) : (
                  <li key={iv.id} className={`${styles.interview} ${new Date(iv.scheduled_at) < now ? styles.past : ''}`}>
                    <div className={styles.interviewMain}>
                      <p className={styles.interviewTitle}>{iv.round}</p>
                      <p className={styles.interviewWhen}>
                        {formatDateTime(iv.scheduled_at)}
                        {new Date(iv.scheduled_at) > now && <strong> · {timeUntil(iv.scheduled_at)}</strong>}
                      </p>
                      {iv.location &&
                        (/^https?:\/\//i.test(iv.location) ? (
                          <a href={iv.location} target="_blank" rel="noopener noreferrer" className={styles.interviewWhere}>
                            {iv.location}
                          </a>
                        ) : (
                          <p className={styles.interviewWhere}>{iv.location}</p>
                        ))}
                      {iv.notes && <p className={styles.interviewNotes}>{iv.notes}</p>}
                    </div>
                    <div className={styles.interviewActions}>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(iv)} aria-label={`Edit ${iv.round}`}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeInterview(iv)} aria-label={`Remove ${iv.round}`}>
                        Remove
                      </Button>
                    </div>
                  </li>
                )
              )}
            </ul>
          ) : (
            editing !== 'new' && <p className={styles.muted}>No interviews scheduled.</p>
          )}
        </section>

        <section aria-labelledby="timeline-heading">
          <div className={styles.sectionHeader}>
            <h3 id="timeline-heading">Status timeline</h3>
          </div>
          <Timeline applicationId={app.id} />
        </section>
      </div>
    </Modal>
  );
}

export default ApplicationDrawer;
