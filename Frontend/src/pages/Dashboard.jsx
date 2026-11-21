import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './Dashboard.module.css';
import Button from '../components/Button';
import Board from '../components/Board';
import ApplicationCard from '../components/ApplicationCard';
import ApplicationForm, { APPLICATION_FORM_ID } from '../components/ApplicationForm';
import ApplicationDrawer from '../components/ApplicationDrawer';
import Modal from '../components/Modal';
import Statistics from '../components/Statistics';
import Toolbar from '../components/Toolbar';
import UpcomingInterviews from '../components/UpcomingInterviews';
import Toast from '../components/Toast';
import OfferModal from '../components/OfferModal';
import CelebrationModal from '../components/CelebrationModal';
import { DashboardSkeleton } from '../components/Skeleton';
import { useApplicationActions, useApplicationsQuery } from '../hooks/useApplications';
import { deleteApplication, toApplicationPayload } from '../services/applicationService';
import { EMPTY_FILTERS, filterAndSort, uniqueRoles, uniqueTags } from '../utils/applications';

const UNDO_MS = 5000;
const VIEW_KEY = 'dashboard-view';

const REJECTION_MESSAGES = [
  "Keep going! Every 'no' brings you closer to 'yes'!",
  'Onward! The right opportunity is waiting for you!',
  'Stay strong! Rejection is redirection!',
  'Their loss! Something better is coming!',
  'Keep pushing! Success loves persistence!',
];

/** Returns the toast text and icon for a status change. */
export function statusToast(fromStatus, toStatus) {
  switch (toStatus) {
    case 'Interview':
      if (fromStatus === 'Applied') return { message: 'Amazing! You got an interview!', icon: '🌟' };
      if (fromStatus === 'OA') return { message: 'Great job on the OA! Interview time!', icon: '🌟' };
      return { message: "Interview scheduled! You've got this!", icon: '🌟' };
    case 'OA':
      return { message: 'Nice! Moving to Online Assessment!', icon: '✓' };
    case 'Rejected':
      return { message: REJECTION_MESSAGES[Math.floor(Math.random() * REJECTION_MESSAGES.length)], icon: '💪' };
    default:
      return { message: `Moved to ${toStatus}`, icon: '✓' };
  }
}

function readView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'board';
  } catch {
    return 'board';
  }
}

function Dashboard() {
  const { data: applications = [], isLoading, isError, error, refetch, isFetching } = useApplicationsQuery();
  const actions = useApplicationActions();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState('newest');
  const [view, setView] = useState(readView);
  const [showArchived, setShowArchived] = useState(false);

  const [form, setForm] = useState(null); // null | { application: app|null }
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [drawerId, setDrawerId] = useState(null);
  const [toast, setToast] = useState(null);
  const [offerFor, setOfferFor] = useState(null);
  const [celebrate, setCelebrate] = useState(null);

  /** Deletes waiting out their undo window: id -> { timer, app }. */
  const pendingDeletes = useRef(new Map());

  const notify = useCallback((message, { type = 'success', icon, celebration = false, action, duration } = {}) => {
    setToast({ id: Date.now() + Math.random(), message, type, icon, celebration, action, duration });
  }, []);

  const changeView = (next) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // ignore
    }
  };

  // ---------------------------------------------------------------- derived data

  const roles = useMemo(() => uniqueRoles(applications), [applications]);
  const tags = useMemo(() => uniqueTags(applications), [applications]);
  const archivedCount = useMemo(() => applications.filter((a) => a.archived).length, [applications]);
  const activeCount = applications.length - archivedCount;
  const visible = useMemo(
    () => filterAndSort(applications, { ...filters, sortBy, archived: showArchived }),
    [applications, filters, sortBy, showArchived]
  );
  const drawerApp = drawerId ? applications.find((a) => a.id === drawerId) : null;
  // A single status or the archive makes columns pointless, so use the list there.
  const effectiveView = filters.status || showArchived ? 'list' : view;
  const filtering = Boolean(filters.status || filters.role || filters.tag || filters.source || filters.minSalary || filters.maxSalary || filters.search);

  // ------------------------------------------------------------- pending deletes

  const commitDelete = useCallback(
    async (id, { keepalive = false } = {}) => {
      const entry = pendingDeletes.current.get(id);
      if (!entry) return;
      clearTimeout(entry.timer);
      pendingDeletes.current.delete(id);
      try {
        await deleteApplication(id, { keepalive });
        actions.afterDelete();
      } catch (err) {
        actions.restoreLocally(entry.app);
        notify(err.message || 'Could not delete the application', { type: 'error' });
      }
    },
    [actions, notify]
  );

  // Leaving the page (or closing the tab) completes any delete still in its undo window.
  // The effect runs once; the ref always points at the latest commitDelete.
  const commitDeleteRef = useRef(commitDelete);
  commitDeleteRef.current = commitDelete;
  useEffect(() => {
    const pending = pendingDeletes.current;
    const flush = () => [...pending.keys()].forEach((id) => commitDeleteRef.current(id, { keepalive: true }));
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  // ---------------------------------------------------------------------- actions

  const openCreate = () => {
    setFormError('');
    setForm({ application: null });
  };

  const openEdit = (app) => {
    setFormError('');
    setForm({ application: app });
  };

  const submitForm = async (values) => {
    const payload = toApplicationPayload(values);
    const editing = form.application;
    setIsSaving(true);
    setFormError('');
    try {
      if (editing) await actions.update(editing.id, payload);
      else await actions.create(payload);
      setForm(null);
      notify(editing ? 'Application updated' : 'Application added');
    } catch (err) {
      setFormError(err.message || 'Failed to save the application');
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = async (app, status) => {
    if (app.status === status) return;
    if (status === 'Offer') {
      setOfferFor(app);
      return;
    }
    try {
      await actions.changeStatus(app, status);
      const { message, icon } = statusToast(app.status, status);
      notify(message, {
        icon,
        action: { label: 'Undo', onClick: () => actions.changeStatus({ ...app, status }, app.status).catch(() => {}) },
      });
    } catch (err) {
      notify(err.message || 'Failed to update status', { type: 'error' });
    }
  };

  const confirmOffer = async () => {
    const app = offerFor;
    setOfferFor(null);
    try {
      await actions.changeStatus(app, 'Offer');
      setCelebrate(app.company);
    } catch (err) {
      notify(err.message || 'Failed to update status', { type: 'error' });
    }
  };

  const toggleArchive = async (app) => {
    const archived = !app.archived;
    try {
      await actions.setArchived(app, archived);
      notify(archived ? `Archived ${app.company}` : `Restored ${app.company}`, {
        icon: archived ? '📦' : '↩',
        action: { label: 'Undo', onClick: () => actions.setArchived({ ...app, archived }, !archived).catch(() => {}) },
      });
    } catch (err) {
      notify(err.message || 'Failed to update the application', { type: 'error' });
    }
  };

  const requestDelete = (app) => {
    if (drawerId === app.id) setDrawerId(null);
    actions.removeLocally(app.id);
    const timer = setTimeout(() => commitDelete(app.id), UNDO_MS);
    pendingDeletes.current.set(app.id, { timer, app });
    notify(`Deleted ${app.company}`, {
      icon: '🗑',
      duration: UNDO_MS,
      action: {
        label: 'Undo',
        onClick: () => {
          const entry = pendingDeletes.current.get(app.id);
          if (!entry) return;
          clearTimeout(entry.timer);
          pendingDeletes.current.delete(app.id);
          actions.restoreLocally(entry.app);
        },
      },
    });
  };

  const cardProps = {
    onOpen: (app) => setDrawerId(app.id),
    onEdit: openEdit,
    onArchive: toggleArchive,
    onDelete: requestDelete,
  };

  // ------------------------------------------------------------------------ render

  const renderContent = () => {
    if (isLoading) return <DashboardSkeleton />;
    if (isError && applications.length === 0) {
      return (
        <div className={styles.state} role="alert">
          <div className={styles.stateIcon} aria-hidden="true">⚠️</div>
          <h2>Couldn't load your applications</h2>
          <p>{error?.message || 'Something went wrong.'}</p>
          <Button onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Retrying…' : 'Try again'}
          </Button>
        </div>
      );
    }
    if (activeCount === 0 && !showArchived) {
      return (
        <div className={styles.state}>
          <div className={styles.stateIcon} aria-hidden="true">📋</div>
          <h2>Track your first application</h2>
          <p>Add the jobs you've applied to and move them across the board as you hear back.</p>
          <Button onClick={openCreate}>+ Add your first application</Button>
          {archivedCount > 0 && (
            <Button variant="ghost" onClick={() => setShowArchived(true)}>
              View {archivedCount} archived
            </Button>
          )}
        </div>
      );
    }
    if (visible.length === 0) {
      return (
        <div className={styles.state}>
          <div className={styles.stateIcon} aria-hidden="true">{showArchived ? '📦' : '🔍'}</div>
          <h2>{showArchived && !filtering ? 'Nothing archived' : 'No matching applications'}</h2>
          <p>
            {showArchived && !filtering
              ? 'Archive rejected or old applications to keep your board focused.'
              : 'Try a different search or clear the filters.'}
          </p>
          {filtering && (
            <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear all filters
            </Button>
          )}
        </div>
      );
    }
    if (effectiveView === 'board') {
      return <Board applications={visible} onStatusChange={changeStatus} {...cardProps} />;
    }
    return (
      <div className={styles.grid}>
        {visible.map((app) => (
          <ApplicationCard key={app.id} application={app} onStatusChange={changeStatus} {...cardProps} />
        ))}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <div>
          <h1 className={styles.title}>{showArchived ? 'Archived applications' : 'Applications'}</h1>
          {!isLoading && applications.length > 0 && (
            <p className={styles.subtitle} aria-live="polite">
              {filtering ? `${visible.length} of ${showArchived ? archivedCount : activeCount} shown` : `${showArchived ? archivedCount : activeCount} total`}
            </p>
          )}
        </div>
        <Button onClick={openCreate} className={styles.addButton} aria-label="Add application">
          <span aria-hidden="true" className={styles.plus}>+</span>
          <span className={styles.addLabel}>Add application</span>
        </Button>
      </div>

      {!isLoading && !isError && !showArchived && activeCount > 0 && (
        <>
          <Statistics applications={applications} activeStatus={filters.status} onSelectStatus={(status) => setFilters((f) => ({ ...f, status }))} />
          <UpcomingInterviews applications={applications} onOpen={(app) => setDrawerId(app.id)} />
        </>
      )}

      {!isLoading && applications.length > 0 && (
        <Toolbar
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          view={effectiveView}
          onViewChange={(v) => {
            changeView(v);
            if (v === 'board') setFilters((f) => ({ ...f, status: null }));
          }}
          roles={roles}
          tags={tags}
          showArchived={showArchived}
          onShowArchivedChange={setShowArchived}
          archivedCount={archivedCount}
        />
      )}

      {renderContent()}

      {form && (
        <Modal
          title={form.application ? `Edit ${form.application.company}` : 'Add application'}
          size="lg"
          onClose={() => setForm(null)}
          closeOnBackdrop={false}
          footer={
            <>
              <Button variant="secondary" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button type="submit" form={APPLICATION_FORM_ID} disabled={isSaving}>
                {isSaving ? 'Saving…' : form.application ? 'Save changes' : 'Add application'}
              </Button>
            </>
          }
        >
          <ApplicationForm
            application={form.application}
            onSubmit={submitForm}
            existingRoles={roles}
            existingTags={tags}
            serverError={formError}
          />
        </Modal>
      )}

      {drawerApp && !form && (
        <ApplicationDrawer
          application={drawerApp}
          onClose={() => setDrawerId(null)}
          onEdit={openEdit}
          actions={actions}
          notify={notify}
        />
      )}

      {offerFor && <OfferModal companyName={offerFor.company} onConfirm={confirmOffer} onCancel={() => setOfferFor(null)} />}
      {celebrate && <CelebrationModal companyName={celebrate} onClose={() => setCelebrate(null)} />}

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          icon={toast.icon}
          celebration={toast.celebration}
          action={toast.action}
          duration={toast.duration || (toast.action ? 6000 : 4000)}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;
