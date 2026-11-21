import React from 'react';
import { Link } from 'react-router-dom';
import styles from './AuthLayout.module.css';
import { ThemeToggle } from './AppShell';

/** Centered card used by login, signup and password reset pages. */
function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link to="/" className={styles.logo}>
          <span className={styles.dot} aria-hidden="true" />
          ApplyRec
        </Link>
        <ThemeToggle />
      </header>
      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          {children}
        </div>
        {footer && <p className={styles.footer}>{footer}</p>}
      </main>
    </div>
  );
}

/** Label + input + inline error, wired up for screen readers. */
export function AuthField({ id, label, error, hint, ...inputProps }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="control"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...inputProps}
      />
      {error ? (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${id}-hint`} className="field-hint">
            {hint}
          </span>
        )
      )}
    </div>
  );
}

export function FormAlert({ children, type = 'error' }) {
  if (!children) return null;
  return (
    <div className={`${styles.alert} ${styles[type]}`} role={type === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export default AuthLayout;
