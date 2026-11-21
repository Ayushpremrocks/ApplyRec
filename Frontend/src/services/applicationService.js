import { apiRequest } from './api';
import { hasValue } from '../utils/applications';

/**
 * Converts form state into the API's request shape.
 * Empty strings become null; salary 0 is kept; referral only applies off-campus.
 */
export function toApplicationPayload(form) {
  const openingType = form.openingType || null;
  return {
    company: form.company.trim(),
    role: form.role.trim(),
    status: form.status,
    appliedDate: form.appliedDate,
    notes: form.notes?.trim() ? form.notes : null,
    followUp: Boolean(form.followUp),
    jobId: form.jobId?.trim() ? form.jobId.trim() : null,
    salary: hasValue(form.salary) ? Number(form.salary) : null,
    jobUrl: form.jobUrl?.trim() ? form.jobUrl.trim() : null,
    openingType,
    referral: openingType === 'OFF_CAMPUS' && Boolean(form.referral),
    tags: form.tags || [],
  };
}

/** datetime-local value ("YYYY-MM-DDTHH:mm", local time) -> request body. */
export function toInterviewPayload(form) {
  return {
    round: form.round?.trim() || null,
    scheduledAt: new Date(form.scheduledAt).toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    location: form.location?.trim() || null,
    notes: form.notes?.trim() || null,
  };
}

export async function createApplication(payload) {
  const response = await apiRequest('/applications', { method: 'POST', body: payload });
  return response.application;
}

export async function getApplications({ signal } = {}) {
  const response = await apiRequest('/applications', { method: 'GET', signal });
  return response.applications;
}

export async function updateApplication(id, payload) {
  const response = await apiRequest(`/applications/${id}`, { method: 'PUT', body: payload });
  return response.application;
}

export async function updateApplicationStatus(id, status) {
  const response = await apiRequest(`/applications/${id}/status`, { method: 'PATCH', body: { status } });
  return response.application;
}

export async function setApplicationArchived(id, archived) {
  const response = await apiRequest(`/applications/${id}/archive`, { method: 'PATCH', body: { archived } });
  return response.application;
}

/** keepalive lets a pending (undo-able) delete finish even if the tab is closing. */
export async function deleteApplication(id, { keepalive = false } = {}) {
  return apiRequest(`/applications/${id}`, { method: 'DELETE', keepalive });
}

export async function getHistory(id, { signal } = {}) {
  const response = await apiRequest(`/applications/${id}/history`, { method: 'GET', signal });
  return response.history;
}

export async function addInterview(applicationId, payload) {
  const response = await apiRequest(`/applications/${applicationId}/interviews`, { method: 'POST', body: payload });
  return response.application;
}

export async function updateInterview(applicationId, interviewId, payload) {
  const response = await apiRequest(`/applications/${applicationId}/interviews/${interviewId}`, {
    method: 'PUT',
    body: payload,
  });
  return response.application;
}

export async function deleteInterview(applicationId, interviewId) {
  const response = await apiRequest(`/applications/${applicationId}/interviews/${interviewId}`, {
    method: 'DELETE',
  });
  return response.application;
}

export async function getAnalytics({ signal } = {}) {
  return apiRequest('/analytics', { method: 'GET', signal });
}
