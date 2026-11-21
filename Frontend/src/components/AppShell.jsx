import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import styles from './AppShell.module.css';
import { logout } from '../services/authService';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className={`${styles.iconButton} ${className}`}
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

const NAV = [
  {
    to: '/dashboard',
    label: 'Applications',
    icon: <path d="M4 5h6v14H4zM14 5h6v8h-6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: <path d="M5 20V10M12 20V4M19 20v-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />,
  },
];

/** Layout for signed-in pages: sticky header with navigation, theme toggle and logout. */
function AppShell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout();
    queryClient.clear(); // never show one user's cached data to the next
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <header className={styles.header}>
        <Link to="/dashboard" className={styles.logo} aria-label="ApplyRec home">
          <span className={styles.logoDot} aria-hidden="true" />
          <span className={styles.logoText}>ApplyRec</span>
        </Link>

        <nav className={styles.nav} aria-label="Main">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                {item.icon}
              </svg>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />
          <button type="button" className={styles.iconButton} onClick={handleLogout} aria-label="Log out" title="Log out">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <main id="main" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
