import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './Dashboard';
import * as service from '../services/applicationService';

vi.mock('../services/applicationService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getApplications: vi.fn(),
    deleteApplication: vi.fn(),
    updateApplicationStatus: vi.fn(),
    setApplicationArchived: vi.fn(),
    getAnalytics: vi.fn(),
  };
});

const APPS = [
  { id: 1, company: 'Acme', role: 'SWE', status: 'Applied', applied_date: '2025-01-10', tags: [], interviews: [], archived: false },
  { id: 2, company: 'Beta', role: 'SDE', status: 'Interview', applied_date: '2025-01-12', tags: [], interviews: [], archived: false },
  { id: 3, company: 'Old Co', role: 'PM', status: 'Rejected', applied_date: '2024-01-12', tags: [], interviews: [], archived: true },
];

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Dashboard />
    </QueryClientProvider>
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.getApplications.mockResolvedValue(APPS.map((a) => ({ ...a })));
    service.deleteApplication.mockResolvedValue({ message: 'ok' });
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a skeleton, then active applications only', async () => {
    renderDashboard();
    expect(screen.getByRole('status', { name: 'Loading applications' })).toBeInTheDocument();
    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.queryByText('Old Co')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archived (1)' })).toBeInTheDocument();
  });

  it('deletes after the undo window, and Undo cancels the delete', async () => {
    renderDashboard();
    await screen.findByText('Acme');
    vi.useFakeTimers();

    // Undo: the card comes back and the API is never called.
    fireEvent.click(screen.getByRole('button', { name: 'Delete Acme' }));
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('Acme')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    expect(service.deleteApplication).not.toHaveBeenCalled();

    // No undo: the delete is sent after 5 seconds.
    fireEvent.click(screen.getByRole('button', { name: 'Delete Beta' }));
    await act(async () => {
      vi.advanceTimersByTime(4900);
    });
    expect(service.deleteApplication).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(service.deleteApplication).toHaveBeenCalledWith(2, { keepalive: false });
  });

  it('moves a card optimistically and rolls back if the server fails', async () => {
    let reject;
    service.updateApplicationStatus.mockImplementation(() => new Promise((_, r) => (reject = r)));
    renderDashboard();
    await screen.findByText('Acme');

    fireEvent.change(screen.getByLabelText('Status of Acme'), { target: { value: 'OA' } });
    await waitFor(() => expect(screen.getByLabelText('Status of Acme')).toHaveValue('OA'));
    expect(reject).toBeTypeOf('function'); // request still in flight

    await act(async () => {
      reject(new Error('Server said no'));
    });
    expect(screen.getByLabelText('Status of Acme')).toHaveValue('Applied');
    expect(await screen.findByText('Server said no')).toBeInTheDocument();
  });

  it('asks before marking an offer', async () => {
    renderDashboard();
    await screen.findByText('Acme');
    fireEvent.change(screen.getByLabelText('Status of Acme'), { target: { value: 'Offer' } });
    expect(screen.getByRole('dialog', { name: 'Did you get an offer?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Just testing' }));
    expect(service.updateApplicationStatus).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Status of Acme')).toHaveValue('Applied');
  });

  it('opens the add form with inline validation', async () => {
    renderDashboard();
    await screen.findByText('Acme');
    fireEvent.click(screen.getByRole('button', { name: /Add application/ }));
    const dialog = screen.getByRole('dialog', { name: 'Add application' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add application' }));
    expect(within(dialog).getByText('Company is required')).toBeInTheDocument();
  });
});
