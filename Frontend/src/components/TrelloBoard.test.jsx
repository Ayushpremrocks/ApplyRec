import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import TrelloBoard from './TrelloBoard';
import Statistics from './Statistics';

const apps = [
  { id: 1, company: 'Acme', role: 'SWE', status: 'Applied', applied_date: '2025-01-10', salary: 0, follow_up: false },
  { id: 2, company: 'Beta', role: 'SDE', status: 'Interview', applied_date: '2025-01-12', salary: null, follow_up: true },
];

function drag(source, target) {
  const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
  fireEvent.dragStart(source, { dataTransfer });
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
}

describe('TrelloBoard', () => {
  it('delegates status changes to the parent instead of calling the API', () => {
    const onStatusChange = vi.fn();
    render(<TrelloBoard applications={apps} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={onStatusChange} />);

    const card = screen.getByText('Acme').closest('[draggable]');
    const offerColumn = screen.getByRole('heading', { name: 'Offer' }).parentElement.parentElement;
    drag(card, offerColumn);

    expect(onStatusChange).toHaveBeenCalledWith(apps[0], 'Offer');
  });

  it('ignores drops onto the same column', () => {
    const onStatusChange = vi.fn();
    render(<TrelloBoard applications={apps} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={onStatusChange} />);
    const card = screen.getByText('Acme').closest('[draggable]');
    const appliedColumn = screen.getByRole('heading', { name: 'Applied' }).parentElement.parentElement;
    drag(card, appliedColumn);
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it('shows a salary of 0', () => {
    render(<TrelloBoard applications={apps} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={vi.fn()} />);
    expect(screen.getByText('0 LPA')).toBeInTheDocument();
  });
});

describe('Statistics', () => {
  it('counts every status and follow-ups', () => {
    const { container } = render(<Statistics applications={apps} />);
    const card = (label) => within(container).getByText(label).parentElement;
    expect(within(card('Total Applications')).getByText('2')).toBeInTheDocument();
    expect(within(card('Interview')).getByText('1')).toBeInTheDocument();
    expect(within(card('Follow Up')).getByText('1')).toBeInTheDocument();
  });
});
