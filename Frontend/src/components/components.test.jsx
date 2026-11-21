import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Board from './Board';
import ApplicationCard from './ApplicationCard';
import ApplicationForm, { APPLICATION_FORM_ID } from './ApplicationForm';
import Modal from './Modal';
import Statistics from './Statistics';
import TagInput from './TagInput';

const apps = [
  { id: 1, company: 'Acme', role: 'SWE', status: 'Applied', applied_date: '2025-01-10', salary: 0, follow_up: false, tags: ['remote'], interviews: [] },
  { id: 2, company: 'Beta', role: 'SDE', status: 'Interview', applied_date: '2025-01-12', salary: null, follow_up: true, tags: [], interviews: [], archived: false },
];

const handlers = () => ({
  onOpen: vi.fn(),
  onEdit: vi.fn(),
  onArchive: vi.fn(),
  onDelete: vi.fn(),
  onStatusChange: vi.fn(),
});

describe('Board', () => {
  it('renders every status column with counts', () => {
    render(<Board applications={apps} {...handlers()} />);
    for (const s of ['Applied', 'OA', 'Interview', 'Rejected', 'Offer']) {
      expect(screen.getByRole('heading', { name: s })).toBeInTheDocument();
    }
    expect(screen.getAllByLabelText('1 applications')).toHaveLength(2);
    expect(screen.getAllByLabelText('0 applications')).toHaveLength(3);
    expect(screen.getAllByText('Drop applications here')).toHaveLength(3);
  });

  it('offers a keyboard drag handle per card', () => {
    render(<Board applications={apps} {...handlers()} />);
    expect(screen.getByRole('button', { name: 'Move Acme to another status' })).toBeInTheDocument();
  });
});

describe('ApplicationCard', () => {
  it('changes status from the menu without drag-and-drop', () => {
    const h = handlers();
    render(<ApplicationCard application={apps[0]} {...h} />);
    fireEvent.change(screen.getByLabelText('Status of Acme'), { target: { value: 'OA' } });
    expect(h.onStatusChange).toHaveBeenCalledWith(apps[0], 'OA');
  });

  it('shows salary 0, tags and labelled actions', () => {
    const h = handlers();
    render(<ApplicationCard application={apps[0]} {...h} />);
    expect(screen.getByText('0 LPA')).toBeInTheDocument();
    expect(screen.getByText('#remote')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Archive Acme' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Acme' }));
    fireEvent.click(screen.getByText('Acme').closest('button'));
    expect(h.onArchive).toHaveBeenCalledWith(apps[0]);
    expect(h.onDelete).toHaveBeenCalledWith(apps[0]);
    expect(h.onOpen).toHaveBeenCalledWith(apps[0]);
  });

  it('links to the job posting safely', () => {
    render(<ApplicationCard application={{ ...apps[0], job_url: 'https://jobs.example.com/1' }} {...handlers()} />);
    const link = screen.getByRole('link', { name: 'Open Acme job posting' });
    expect(link).toHaveAttribute('href', 'https://jobs.example.com/1');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('Statistics', () => {
  it('counts active applications and filters on click', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <Statistics applications={[...apps, { ...apps[0], id: 9, archived: true }]} onSelectStatus={onSelect} />
    );
    const tile = (label) => within(container).getByText(label).closest('div, button');
    expect(within(tile('Total Applications')).getByText('2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Interview/ }));
    expect(onSelect).toHaveBeenCalledWith('Interview');
  });
});

describe('Modal', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open</button>
        {open && (
          <Modal title="Dialog" onClose={() => setOpen(false)}>
            <input aria-label="First" data-autofocus />
            <button>Last</button>
          </Modal>
        )}
      </>
    );
  }

  it('focuses inside, closes on Escape and returns focus to the opener', () => {
    render(<Harness />);
    const opener = screen.getByText('Open');
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Dialog' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('First')).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('traps Tab inside the dialog', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Open'));
    const dialog = screen.getByRole('dialog');
    screen.getByText('Last').focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });
});

describe('ApplicationForm', () => {
  const renderForm = (props = {}) => {
    const onSubmit = vi.fn();
    render(
      <>
        <ApplicationForm onSubmit={onSubmit} {...props} />
        <button type="submit" form={APPLICATION_FORM_ID}>
          Save
        </button>
      </>
    );
    return onSubmit;
  };

  it('shows inline errors and does not submit an invalid form', () => {
    const onSubmit = renderForm();
    fireEvent.click(screen.getByText('Save'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Company is required')).toBeInTheDocument();
    expect(screen.getByText('Role is required')).toBeInTheDocument();
    expect(screen.getByLabelText(/Company/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Company/)).toHaveFocus();
  });

  it('validates a field when the user leaves it', () => {
    renderForm();
    const url = screen.getByLabelText('Job posting link');
    fireEvent.change(url, { target: { value: 'not a link' } });
    expect(screen.queryByText(/full link/)).not.toBeInTheDocument();
    fireEvent.blur(url);
    expect(screen.getByText('Enter a full link starting with https://')).toBeInTheDocument();
  });

  it('only offers the referral switch for off-campus openings and submits the new fields', () => {
    const onSubmit = renderForm();
    fireEvent.change(screen.getByLabelText(/Company/), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText(/^Role/), { target: { value: 'SWE' } });
    expect(screen.queryByText('I got a referral')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Off-campus'));
    fireEvent.click(screen.getByLabelText(/I got a referral/));
    const tags = screen.getByLabelText('Tags');
    fireEvent.change(tags, { target: { value: 'Remote' } });
    fireEvent.keyDown(tags, { key: 'Enter' });
    fireEvent.click(screen.getByText('Save'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      company: 'Acme',
      openingType: 'OFF_CAMPUS',
      referral: true,
      tags: ['remote'],
    });
  });
});

describe('TagInput', () => {
  function Harness() {
    const [tags, setTags] = useState(['a']);
    return <TagInput id="t" value={tags} onChange={setTags} />;
  }

  it('adds with comma/Enter, ignores duplicates and removes with Backspace', () => {
    render(<Harness />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'b,A,' } });
    expect(screen.getByText('#b')).toBeInTheDocument();
    expect(screen.getAllByText('#a')).toHaveLength(1);
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(screen.queryByText('#b')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove tag a' }));
    expect(screen.queryByText('#a')).not.toBeInTheDocument();
  });
});
