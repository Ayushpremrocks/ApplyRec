import React, { useId, useMemo, useState } from 'react';
import styles from './ApplicationForm.module.css';
import TagInput from './TagInput';
import { STATUSES, hasValue, validateApplication } from '../utils/applications';
import { todayIso } from '../utils/date';

export const APPLICATION_FORM_ID = 'application-form';

function initialState(app) {
  if (!app) {
    return {
      company: '',
      role: '',
      status: 'Applied',
      appliedDate: todayIso(),
      notes: '',
      followUp: false,
      jobId: '',
      salary: '',
      jobUrl: '',
      openingType: '',
      referral: false,
      tags: [],
    };
  }
  return {
    company: app.company,
    role: app.role,
    status: app.status,
    // The API sends a plain "YYYY-MM-DD" date; use it as-is to avoid timezone shifts.
    appliedDate: app.applied_date || '',
    notes: app.notes || '',
    followUp: Boolean(app.follow_up),
    jobId: app.job_id || '',
    salary: hasValue(app.salary) ? String(app.salary) : '',
    jobUrl: app.job_url || '',
    openingType: app.opening_type || '',
    referral: Boolean(app.referral),
    tags: app.tags || [],
  };
}

const SOURCE_OPTIONS = [
  { value: 'ON_CAMPUS', label: 'On-campus' },
  { value: 'OFF_CAMPUS', label: 'Off-campus' },
  { value: '', label: 'Not set' },
];

/**
 * Add/edit form. Validates inline (after a field is left, or on submit) with the same rules
 * as the API. The submit button lives in the modal footer and targets this form by id.
 */
function ApplicationForm({ application, onSubmit, existingRoles = [], existingTags = [], serverError }) {
  const [form, setForm] = useState(() => initialState(application));
  const [touched, setTouched] = useState({});
  const [dirty, setDirty] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const uid = useId();
  const ids = useMemo(
    () => Object.fromEntries(['company', 'role', 'status', 'appliedDate', 'salary', 'jobId', 'jobUrl', 'tags', 'notes', 'roles'].map((k) => [k, `${uid}-${k}`])),
    [uid]
  );

  const errors = validateApplication(form);
  const showError = (field) => (touched[field] || submitted) && errors[field];

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };
  // Only flag a field on blur once the user has typed in it; empty required fields are
  // reported on submit, so tabbing through the form never shows errors.
  const blur = (field) => () => {
    if (dirty[field]) setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const fieldProps = (field) => ({
    id: ids[field],
    value: form[field],
    onChange: set(field),
    onBlur: blur(field),
    'aria-invalid': showError(field) ? 'true' : undefined,
    'aria-describedby': showError(field) ? `${ids[field]}-error` : undefined,
    className: 'control',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) {
      document.getElementById(ids[firstInvalid])?.focus();
      return;
    }
    onSubmit(form);
  };

  const fieldError = (field) =>
    showError(field) ? (
      <span id={`${ids[field]}-error`} className="field-error">
        {errors[field]}
      </span>
    ) : null;

  return (
    <form id={APPLICATION_FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div className={styles.serverError} role="alert">
          {serverError}
        </div>
      )}

      <div className={styles.grid}>
        <div className="field">
          <label className="field-label" htmlFor={ids.company}>
            Company<span className="req" aria-hidden="true">*</span>
          </label>
          <input {...fieldProps('company')} required autoComplete="organization" data-autofocus />
          {fieldError('company')}
        </div>

        <div className="field">
          <label className="field-label" htmlFor={ids.role}>
            Role<span className="req" aria-hidden="true">*</span>
          </label>
          <input {...fieldProps('role')} required list={ids.roles} autoComplete="off" />
          <datalist id={ids.roles}>
            {existingRoles.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          {fieldError('role')}
        </div>

        <div className="field">
          <label className="field-label" htmlFor={ids.status}>
            Status
          </label>
          <select {...fieldProps('status')}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor={ids.appliedDate}>
            Applied on<span className="req" aria-hidden="true">*</span>
          </label>
          <input {...fieldProps('appliedDate')} type="date" required max={todayIso()} />
          {fieldError('appliedDate')}
        </div>

        <div className="field">
          <label className="field-label" htmlFor={ids.salary}>
            Salary (LPA)
          </label>
          <input
            {...fieldProps('salary')}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            max="9999.99"
            placeholder="e.g. 12 or 14.5"
          />
          {fieldError('salary')}
        </div>

        <div className="field">
          <label className="field-label" htmlFor={ids.jobId}>
            Job ID
          </label>
          <input {...fieldProps('jobId')} placeholder="e.g. JOB-12345" autoComplete="off" />
          {fieldError('jobId')}
        </div>

        <div className={`field ${styles.full}`}>
          <label className="field-label" htmlFor={ids.jobUrl}>
            Job posting link
          </label>
          <input {...fieldProps('jobUrl')} type="url" inputMode="url" placeholder="https://careers.company.com/jobs/…" autoComplete="url" />
          {fieldError('jobUrl')}
        </div>

        <fieldset className={`${styles.full} ${styles.fieldset}`}>
          <legend className="field-label">Where did you find this opening?</legend>
          <div className={styles.segmented}>
            {SOURCE_OPTIONS.map((opt) => (
              <label key={opt.value || 'none'} className={`${styles.segment} ${form.openingType === opt.value ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name={`${uid}-opening`}
                  value={opt.value}
                  checked={form.openingType === opt.value}
                  onChange={() => setForm((prev) => ({ ...prev, openingType: opt.value, referral: opt.value === 'OFF_CAMPUS' ? prev.referral : false }))}
                />
                {opt.label}
              </label>
            ))}
          </div>
          {form.openingType === 'OFF_CAMPUS' && (
            <label className={styles.switchRow}>
              <input type="checkbox" className={styles.switch} checked={form.referral} onChange={set('referral')} />
              <span>
                <strong>I got a referral</strong>
                <span className="field-hint"> Someone at the company referred me</span>
              </span>
            </label>
          )}
        </fieldset>

        <div className={`field ${styles.full}`}>
          <label className="field-label" htmlFor={ids.tags}>
            Tags
          </label>
          <TagInput id={ids.tags} value={form.tags} onChange={(tags) => setForm((prev) => ({ ...prev, tags }))} suggestions={existingTags} />
          <span className="field-hint">Press Enter or comma to add. Up to 10.</span>
        </div>

        <div className={`field ${styles.full}`}>
          <label className="field-label" htmlFor={ids.notes}>
            Notes
          </label>
          <textarea {...fieldProps('notes')} rows={4} placeholder="Recruiter name, prep notes, anything useful…" />
        </div>

        <label className={`${styles.full} ${styles.switchRow}`}>
          <input type="checkbox" className={styles.switch} checked={form.followUp} onChange={set('followUp')} />
          <span>
            <strong>Mark for follow-up</strong>
            <span className="field-hint"> Highlights the card until you clear it</span>
          </span>
        </label>
      </div>
    </form>
  );
}

export default ApplicationForm;
