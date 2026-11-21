import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Landing.module.css';
import { ThemeToggle } from '../components/AppShell';

const ICONS = {
  board: 'M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v6h-4z',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0',
  chart: 'M5 20V11M12 20V5M19 20v-6',
  campus: 'M3 10l9-5 9 5-9 5zM7 12v4c3 2 7 2 10 0v-4',
  tag: 'M4 4h7l9 9-7 7-9-9zM8 8h.01',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
};

const FEATURES = [
  {
    icon: 'board',
    title: 'A board that fits your search',
    description: 'Drag applications between stages with a mouse, a finger or the keyboard — or just pick a status.',
  },
  {
    icon: 'bell',
    title: 'Interview reminders',
    description: 'Schedule each round and get an email the day before, so nothing sneaks up on you.',
  },
  {
    icon: 'chart',
    title: 'Honest analytics',
    description: 'Response, interview and offer rates, how long companies take to reply, and your weekly pace.',
  },
  {
    icon: 'campus',
    title: 'Campus and referrals',
    description: 'Mark openings as on- or off-campus, note referrals, and see which route actually converts.',
  },
  {
    icon: 'tag',
    title: 'Tags, filters and archive',
    description: 'Group with tags, filter by role, salary or source, and archive old applications to stay focused.',
  },
  {
    icon: 'clock',
    title: 'A timeline for every application',
    description: 'Every status change is recorded, so you can see exactly how each one progressed.',
  },
];

const STEPS = [
  { title: 'Add an application', description: 'Company, role, link and salary — the rest is optional.' },
  { title: 'Move it as you hear back', description: 'Applied, OA, interview, offer. Schedule rounds as they come.' },
  { title: 'Learn what works', description: 'Analytics show where you get responses and where you don’t.' },
];

const PREVIEW = [
  { status: 'Applied', color: 'var(--st-applied)', cards: [['Northwind', 'Backend Engineer'], ['Contoso', 'SDE I']] },
  { status: 'OA', color: 'var(--st-oa)', cards: [['Fabrikam', 'Software Engineer']] },
  { status: 'Interview', color: 'var(--st-interview)', cards: [['Tailspin', 'Frontend Engineer', 'Tomorrow · 10:00']] },
  { status: 'Offer', color: 'var(--st-offer)', cards: [['Litware', 'Platform Engineer']] },
];

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Landing() {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoDot} aria-hidden="true" />
          ApplyRec
        </Link>
        <nav className={styles.navLinks} aria-label="Site">
          <a href="#features" className={styles.navLink}>
            Features
          </a>
          <Link to="/login" className={styles.navLink}>
            Sign in
          </Link>
          <ThemeToggle />
          <Link to="/signup" className={styles.navCta}>
            Get started
          </Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Free job application tracker</p>
          <h1 className={styles.title}>
            Every application,
            <br />
            one calm place.
          </h1>
          <p className={styles.lead}>
            Track where you applied, what stage you’re at and when your next interview is — without
            the spreadsheet.
          </p>
          <div className={styles.actions}>
            <Link to="/signup" className={styles.primary}>
              Start tracking — it’s free
            </Link>
            <Link to="/login" className={styles.secondary}>
              Sign in
            </Link>
          </div>
          <p className={styles.note}>Works on your phone, tablet and laptop. Light and dark mode.</p>
        </section>

        <section className={styles.previewWrap} aria-label="Product preview">
          <div className={styles.preview} aria-hidden="true">
            <div className={styles.previewBar}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.previewBoard}>
              {PREVIEW.map((col) => (
                <div key={col.status} className={styles.previewCol} style={{ '--c': col.color }}>
                  <p className={styles.previewHead}>
                    <i />
                    {col.status}
                    <b>{col.cards.length}</b>
                  </p>
                  {col.cards.map(([company, role, when]) => (
                    <div key={company} className={styles.previewCard}>
                      <strong>{company}</strong>
                      <span>{role}</span>
                      {when && <em>{when}</em>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>Everything you need, nothing you don’t</h2>
            <p>Built for students and early-career job seekers juggling dozens of applications.</p>
          </div>
          <div className={styles.features}>
            {FEATURES.map((f) => (
              <article key={f.title} className={styles.feature}>
                <span className={styles.featureIcon}>
                  <Icon name={f.icon} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>How it works</h2>
          </div>
          <ol className={styles.steps}>
            {STEPS.map((s, i) => (
              <li key={s.title} className={styles.step}>
                <span className={styles.stepNum}>{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.cta}>
          <h2>Ready to get organised?</h2>
          <p>Create an account in seconds. Free, no credit card.</p>
          <Link to="/signup" className={styles.primary}>
            Create free account
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.logo}>
          <span className={styles.logoDot} aria-hidden="true" />
          ApplyRec
        </span>
        <p>Built for students, by students.</p>
      </footer>
    </div>
  );
}

export default Landing;
