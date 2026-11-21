import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Landing.module.css';
import { ThemeToggle } from '../components/AppShell';

const FEATURES = [
  {
    icon: '01',
    title: 'Kanban Board',
    description: 'Drag cards between stages with mouse, touch or keyboard — or just pick a status from the card.',
  },
  {
    icon: '02',
    title: 'Interview Reminders',
    description: 'Schedule every round and get an email reminder the day before.',
  },
  {
    icon: '03',
    title: 'Analytics',
    description: 'Response rate, interview rate, time to hear back and weekly activity at a glance.',
  },
  {
    icon: '04',
    title: 'Campus & Referrals',
    description: 'Mark openings as on- or off-campus and see whether referrals convert better.',
  },
  {
    icon: '05',
    title: 'Tags, Filters & Archive',
    description: 'Tag applications, filter by role, salary or source, and archive the old ones.',
  },
  {
    icon: '06',
    title: 'Status Timeline',
    description: 'Every status change is recorded so you can see how each application progressed.',
  },
];

function Landing() {
  return (
    <div className={styles.container}>
      <div className={styles.floatingDot}></div>
      <div className={styles.floatingDot}></div>
      <div className={styles.floatingDot}></div>
      <div className={styles.floatingDot}></div>
      <div className={styles.floatingDot}></div>

      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span className={styles.logoDot}></span>
          ApplyRec
        </div>
        <div className={styles.navLinks}>
          <ThemeToggle />
          <Link to="/login" className={styles.navLink}>Login</Link>
          <Link to="/signup" className={styles.navButton}>Get Started</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Track Your
            <span className={styles.heroHighlight}> Job Application </span>
            Journey
          </h1>
          <p className={styles.heroSubtitle}>
            Organize, track, and manage all your job applications in one place.
            From application to offer, never lose track of your opportunities.
          </p>
          <div className={styles.heroActions}>
            <Link to="/signup" className={styles.primaryButton}>
              Start Tracking Free
            </Link>
            <Link to="/login" className={styles.secondaryButton}>
              Sign In
            </Link>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>5</span>
              <span className={styles.heroStatLabel}>Pipeline Stages</span>
            </div>
            <div className={styles.heroStatDivider}></div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>∞</span>
              <span className={styles.heroStatLabel}>Applications</span>
            </div>
            <div className={styles.heroStatDivider}></div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>100%</span>
              <span className={styles.heroStatLabel}>Free</span>
            </div>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.mockupCard}>
            <div className={styles.mockupHeader}>
              <div className={styles.mockupDot}></div>
              <div className={styles.mockupDot}></div>
              <div className={styles.mockupDot}></div>
            </div>
            <div className={styles.mockupContent}>
              <div className={styles.mockupStat}>
                <span className={styles.mockupStatValue}>12</span>
                <span className={styles.mockupStatLabel}>Total</span>
              </div>
              <div className={styles.mockupStat}>
                <span className={`${styles.mockupStatValue} ${styles.green}`}>3</span>
                <span className={styles.mockupStatLabel}>Interviews</span>
              </div>
              <div className={styles.mockupStat}>
                <span className={`${styles.mockupStatValue} ${styles.purple}`}>2</span>
                <span className={styles.mockupStatLabel}>Offers</span>
              </div>
            </div>
            <div className={styles.mockupList}>
              <div className={styles.mockupItem}>
                <div className={styles.mockupItemLeft}>
                  <span className={styles.mockupCompany}>Google</span>
                  <span className={styles.mockupSalary}>24 LPA</span>
                </div>
                <span className={`${styles.mockupBadge} ${styles.interview}`}>Interview</span>
              </div>
              <div className={styles.mockupItem}>
                <div className={styles.mockupItemLeft}>
                  <span className={styles.mockupCompany}>Meta</span>
                  <span className={styles.mockupSalary}>28 LPA</span>
                </div>
                <span className={`${styles.mockupBadge} ${styles.applied}`}>Applied</span>
              </div>
              <div className={styles.mockupItem}>
                <div className={styles.mockupItemLeft}>
                  <span className={styles.mockupCompany}>Amazon</span>
                  <span className={styles.mockupSalary}>22.5 LPA</span>
                </div>
                <span className={`${styles.mockupBadge} ${styles.offer}`}>Offer</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.featuresHeader}>
          <h2 className={styles.featuresTitle}>Everything You Need</h2>
          <p className={styles.featuresSubtitle}>
            Simple yet powerful features to manage your job search effectively
          </p>
        </div>
        <div className={styles.featuresGrid}>
          {FEATURES.map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready to Get Organized?</h2>
        <p className={styles.ctaSubtitle}>
          Start tracking your applications today. It's completely free.
        </p>
        <Link to="/signup" className={styles.ctaButton}>
          Create Free Account
        </Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <span className={styles.logoDot}></span>
            ApplyRec
          </div>
          <p className={styles.footerText}>
            Built for students, by students. Track your job application journey.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
