import React, { useId, useState } from 'react';
import styles from './ApplicationDrawer.module.css';
import Button from './Button';
import { toDateTimeLocal } from '../utils/date';

function defaultSlot() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toDateTimeLocal(d);
}

/** Inline form to schedule or edit one interview round. */
function InterviewForm({ interview, onSave, onCancel, saving }) {
  const uid = useId();
  const [form, setForm] = useState({
    round: interview?.round || '',
    scheduledAt: interview ? toDateTimeLocal(interview.scheduled_at) : defaultSlot(),
    location: interview?.location || '',
    notes: interview?.notes || '',
  });
  const [submitted, setSubmitted] = useState(false);
  const dateError = !form.scheduledAt || Number.isNaN(new Date(form.scheduledAt).getTime()) ? 'Pick a date and time' : null;

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <form
      className={styles.interviewForm}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (!dateError) onSave(form);
      }}
      noValidate
    >
      <div className={styles.formGrid}>
        <div className="field">
          <label className="field-label" htmlFor={`${uid}-round`}>
            Round
          </label>
          <input
            id={`${uid}-round`}
            className="control"
            value={form.round}
            onChange={set('round')}
            placeholder="e.g. Technical round 1"
            maxLength={100}
            data-autofocus
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${uid}-when`}>
            Date &amp; time<span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id={`${uid}-when`}
            className="control"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={set('scheduledAt')}
            aria-invalid={submitted && dateError ? 'true' : undefined}
            aria-describedby={submitted && dateError ? `${uid}-when-error` : undefined}
            required
          />
          {submitted && dateError && (
            <span id={`${uid}-when-error`} className="field-error">
              {dateError}
            </span>
          )}
        </div>
        <div className={`field ${styles.span2}`}>
          <label className="field-label" htmlFor={`${uid}-where`}>
            Where
          </label>
          <input
            id={`${uid}-where`}
            className="control"
            value={form.location}
            onChange={set('location')}
            placeholder="Meeting link or office address"
            maxLength={500}
          />
        </div>
        <div className={`field ${styles.span2}`}>
          <label className="field-label" htmlFor={`${uid}-notes`}>
            Prep notes
          </label>
          <textarea id={`${uid}-notes`} className="control" rows={3} value={form.notes} onChange={set('notes')} />
        </div>
      </div>
      <p className="field-hint">You'll get an email reminder about a day before (when email is set up).</p>
      <div className={styles.formActions}>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : interview ? 'Save changes' : 'Add interview'}
        </Button>
      </div>
    </form>
  );
}

export default InterviewForm;
