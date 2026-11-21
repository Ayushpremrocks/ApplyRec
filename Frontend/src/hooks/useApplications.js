import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addInterview,
  createApplication,
  deleteInterview,
  getAnalytics,
  getApplications,
  getHistory,
  setApplicationArchived,
  updateApplication,
  updateApplicationStatus,
  updateInterview,
} from '../services/applicationService';

export const queryKeys = {
  applications: ['applications'],
  analytics: ['analytics'],
  history: (id) => ['history', id],
};

export function useApplicationsQuery() {
  return useQuery({
    queryKey: queryKeys.applications,
    queryFn: ({ signal }) => getApplications({ signal }),
  });
}

export function useAnalyticsQuery() {
  return useQuery({
    queryKey: queryKeys.analytics,
    queryFn: ({ signal }) => getAnalytics({ signal }),
  });
}

export function useHistoryQuery(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.history(id),
    queryFn: ({ signal }) => getHistory(id, { signal }),
    enabled: Boolean(id) && enabled,
  });
}

/**
 * Cache-aware write operations. Status and archive changes are optimistic: the UI updates
 * immediately and rolls back if the server rejects the change.
 */
export function useApplicationActions() {
  const queryClient = useQueryClient();

  const setList = useCallback(
    (updater) => queryClient.setQueryData(queryKeys.applications, (old) => (old ? updater(old) : old)),
    [queryClient]
  );

  const replace = useCallback(
    (updated) => setList((list) => list.map((a) => (a.id === updated.id ? updated : a))),
    [setList]
  );

  /** Analytics and timelines are derived server-side; refresh them after any write. */
  const invalidateDerived = useCallback(
    (id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics });
      if (id) queryClient.invalidateQueries({ queryKey: queryKeys.history(id) });
    },
    [queryClient]
  );

  const optimistic = useCallback(
    async (app, patch, request) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.applications });
      replace({ ...app, ...patch });
      try {
        const updated = await request();
        replace(updated);
        invalidateDerived(app.id);
        return updated;
      } catch (err) {
        replace(app);
        throw err;
      }
    },
    [queryClient, replace, invalidateDerived]
  );

  return {
    create: async (payload) => {
      const created = await createApplication(payload);
      setList((list) => [created, ...list]);
      invalidateDerived(created.id);
      return created;
    },
    update: async (id, payload) => {
      const updated = await updateApplication(id, payload);
      replace(updated);
      invalidateDerived(id);
      return updated;
    },
    changeStatus: (app, status) => optimistic(app, { status }, () => updateApplicationStatus(app.id, status)),
    setArchived: (app, archived) => optimistic(app, { archived }, () => setApplicationArchived(app.id, archived)),
    /** Removes from the cache only; the caller decides when to call the API (undo window). */
    removeLocally: (id) => setList((list) => list.filter((a) => a.id !== id)),
    restoreLocally: (app) =>
      setList((list) => (list.some((a) => a.id === app.id) ? list : [...list, app])),
    afterDelete: () => invalidateDerived(),
    addInterview: async (appId, payload) => {
      const updated = await addInterview(appId, payload);
      replace(updated);
      invalidateDerived();
      return updated;
    },
    updateInterview: async (appId, interviewId, payload) => {
      const updated = await updateInterview(appId, interviewId, payload);
      replace(updated);
      invalidateDerived();
      return updated;
    },
    deleteInterview: async (appId, interviewId) => {
      const updated = await deleteInterview(appId, interviewId);
      replace(updated);
      invalidateDerived();
      return updated;
    },
  };
}
