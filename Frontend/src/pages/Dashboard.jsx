import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';
import Button from '../components/Button';
import ApplicationCard from '../components/ApplicationCard';
import ApplicationForm from '../components/ApplicationForm';
import FilterBar from '../components/FilterBar';
import Statistics from '../components/Statistics';
import SearchBar from '../components/SearchBar';
import SortOptions from '../components/SortOptions';
import TrelloBoard from '../components/TrelloBoard';
import AdvancedFilters from '../components/AdvancedFilters';
import Toast from '../components/Toast';
import OfferModal from '../components/OfferModal';
import CelebrationModal from '../components/CelebrationModal';
import {
  getApplications,
  createApplication,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
  toApplicationPayload,
} from '../services/applicationService';
import { logout } from '../services/authService';
import { filterAndSort, uniqueRoles } from '../utils/applications';

const REJECTION_MESSAGES = [
  "Keep going! Every 'no' brings you closer to 'yes'!",
  'Onward! The right opportunity is waiting for you!',
  'Stay strong! Rejection is redirection!',
  'Their loss! Something better is coming!',
  'Keep pushing! Success loves persistence!',
];

/** Returns the toast text and icon for a status change. */
function statusToast(fromStatus, toStatus) {
  switch (toStatus) {
    case 'Interview':
      if (fromStatus === 'Applied') return { message: 'Amazing! You got an interview!', icon: '🌟' };
      if (fromStatus === 'OA') return { message: 'Great job on the OA! Interview time!', icon: '🌟' };
      return { message: "Interview scheduled! You've got this!", icon: '🌟' };
    case 'OA':
      return { message: 'Nice! Moving to Online Assessment!', icon: '✓' };
    case 'Rejected':
      return {
        message: REJECTION_MESSAGES[Math.floor(Math.random() * REJECTION_MESSAGES.length)],
        icon: '💪',
      };
    case 'Offer':
      return { message: 'Status updated to Offer', icon: '🎉', celebration: true };
    default:
      return { message: 'Status updated!', icon: '✓' };
  }
}

function Dashboard() {
  const navigate = useNavigate();

  // Full, unfiltered list for this user. Everything else is derived from it.
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('board');

  const [showForm, setShowForm] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [toast, setToast] = useState(null);
  const [offerModal, setOfferModal] = useState(null);
  const [celebrationModal, setCelebrationModal] = useState(null);

  const showToast = useCallback((message, { type = 'success', icon, celebration = false } = {}) => {
    setToast({ id: Date.now(), message, type, icon, celebration });
  }, []);
  const hideToast = useCallback(() => setToast(null), []);

  const loadApplications = useCallback(async (signal) => {
    try {
      const data = await getApplications({}, { signal });
      setApplications(data);
      setError('');
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to load applications');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadApplications(controller.signal);
    return () => controller.abort();
  }, [loadApplications]);

  const existingRoles = useMemo(() => uniqueRoles(applications), [applications]);

  const visibleApplications = useMemo(
    () =>
      filterAndSort(applications, {
        status: statusFilter,
        role: roleFilter,
        minSalary,
        maxSalary,
        search: searchQuery,
        sortBy,
      }),
    [applications, statusFilter, roleFilter, minSalary, maxSalary, searchQuery, sortBy]
  );

  const hasActiveFilters = Boolean(statusFilter || roleFilter || minSalary || maxSalary || searchQuery);
  // A single-status filter makes the board pointless, so show the grid instead.
  const effectiveView = statusFilter ? 'grid' : viewMode;

  const replaceApplication = useCallback((updated) => {
    setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }, []);

  const handleCreate = () => {
    setEditingApplication(null);
    setShowForm(true);
  };

  const handleEdit = (application) => {
    setEditingApplication(application);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingApplication(null);
  };

  const handleFormSubmit = async (formData) => {
    const payload = toApplicationPayload(formData);
    const isEdit = Boolean(editingApplication);
    try {
      setIsSaving(true);
      if (isEdit) {
        replaceApplication(await updateApplication(editingApplication.id, payload));
      } else {
        const created = await createApplication(payload);
        setApplications((prev) => [created, ...prev]);
      }
      closeForm();
      setError('');
      showToast(isEdit ? 'Application updated!' : 'Application created!');
    } catch (err) {
      showToast(err.message || 'Failed to save application', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    try {
      await deleteApplication(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      showToast('Application deleted');
    } catch (err) {
      showToast(err.message || 'Failed to delete application', { type: 'error' });
    }
  };

  /** Optimistically moves a card, then reconciles with the server (or rolls back). */
  const changeStatus = useCallback(
    async (application, newStatus) => {
      const previous = application;
      replaceApplication({ ...application, status: newStatus });
      try {
        const updated = await updateApplicationStatus(application.id, newStatus);
        replaceApplication(updated);
        return true;
      } catch (err) {
        replaceApplication(previous);
        showToast(err.message || 'Failed to update status', { type: 'error' });
        return false;
      }
    },
    [replaceApplication, showToast]
  );

  const handleStatusChange = async (application, newStatus) => {
    if (application.status === newStatus) return;
    if (newStatus === 'Offer') {
      setOfferModal({ application });
      return;
    }
    if (await changeStatus(application, newStatus)) {
      const { message, icon } = statusToast(application.status, newStatus);
      showToast(message, { icon });
    }
  };

  const handleOfferConfirm = async () => {
    const { application } = offerModal;
    setOfferModal(null);
    if (await changeStatus(application, 'Offer')) {
      setCelebrationModal({ companyName: application.company });
    }
  };

  // "Just testing": close the dialog and leave the status unchanged.
  const handleOfferCancel = () => setOfferModal(null);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const clearAdvancedFilters = () => {
    setRoleFilter('');
    setMinSalary('');
    setMaxSalary('');
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className={styles.loading}>Loading applications...</div>;
    }
    if (applications.length === 0) {
      return (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📋</div>
          <p className={styles.emptyTitle}>No applications yet</p>
          <p className={styles.emptyText}>Start tracking your job applications to stay organized</p>
          <Button onClick={handleCreate}>Add Your First Application</Button>
        </div>
      );
    }
    if (visibleApplications.length === 0) {
      return (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔍</div>
          <p className={styles.emptyTitle}>No results found</p>
          <p className={styles.emptyText}>Try adjusting your search or filters</p>
        </div>
      );
    }
    if (effectiveView === 'board') {
      return (
        <TrelloBoard
          applications={visibleApplications}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      );
    }
    return (
      <div className={styles.grid}>
        {visibleApplications.map((app) => (
          <ApplicationCard key={app.id} application={app} onEdit={handleEdit} onDelete={handleDelete} />
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          icon={toast.icon}
          celebration={toast.celebration}
          onClose={hideToast}
        />
      )}
      {offerModal && (
        <OfferModal
          companyName={offerModal.application.company}
          onConfirm={handleOfferConfirm}
          onCancel={handleOfferCancel}
        />
      )}
      {celebrationModal && (
        <CelebrationModal
          companyName={celebrationModal.companyName}
          onClose={() => setCelebrationModal(null)}
        />
      )}

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>ApplyRec</h1>
          {applications.length > 0 && (
            <span className={styles.appCount}>
              {hasActiveFilters
                ? `${visibleApplications.length} of ${applications.length} applications`
                : `${applications.length} applications`}
            </span>
          )}
        </div>
        <div className={styles.headerActions}>
          <Button onClick={handleCreate} disabled={showForm}>
            Add Application
          </Button>
          <Button variant="secondary" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className={styles.main}>
        {showForm ? (
          <div className={styles.formContainer}>
            <ApplicationForm
              application={editingApplication}
              onSubmit={handleFormSubmit}
              onCancel={closeForm}
              isLoading={isSaving}
              existingRoles={existingRoles}
            />
          </div>
        ) : (
          <>
            <Statistics applications={applications} />

            <div className={styles.controls}>
              <div className={styles.controlsLeft}>
                <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
              </div>
              <div className={styles.controlsRight}>
                <SortOptions sortBy={sortBy} onSortChange={setSortBy} />
                {!statusFilter && (
                  <div className={styles.viewToggle}>
                    <button
                      type="button"
                      className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                      onClick={() => setViewMode('grid')}
                    >
                      Grid
                    </button>
                    <button
                      type="button"
                      className={`${styles.viewButton} ${viewMode === 'board' ? styles.active : ''}`}
                      onClick={() => setViewMode('board')}
                    >
                      Board
                    </button>
                  </div>
                )}
              </div>
            </div>

            <AdvancedFilters
              roles={existingRoles}
              selectedRole={roleFilter}
              onRoleChange={setRoleFilter}
              minSalary={minSalary}
              maxSalary={maxSalary}
              onMinSalaryChange={setMinSalary}
              onMaxSalaryChange={setMaxSalary}
              onClear={clearAdvancedFilters}
            />

            <FilterBar selectedStatus={statusFilter} onFilterChange={setStatusFilter} />

            {error && (
              <div className={styles.error}>
                {error}{' '}
                <Button variant="secondary" onClick={() => loadApplications()}>
                  Retry
                </Button>
              </div>
            )}

            {renderContent()}
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
