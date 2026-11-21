import React, { useId, useState } from 'react';
import styles from './TagInput.module.css';
import { MAX_TAGS, normalizeTag } from '../utils/applications';

/** Chips + text box. Enter or comma adds a tag; Backspace on an empty box removes the last. */
function TagInput({ id, value, onChange, suggestions = [] }) {
  const [draft, setDraft] = useState('');
  const listId = useId();
  const full = value.length >= MAX_TAGS;

  const add = (raw) => {
    const tag = normalizeTag(raw);
    if (!tag || value.includes(tag) || full) return;
    onChange([...value, tag]);
  };

  const commitDraft = () => {
    draft.split(',').forEach(add);
    setDraft('');
  };

  return (
    <div className={styles.box}>
      {value.map((tag) => (
        <span key={tag} className={styles.chip}>
          #{tag}
          <button
            type="button"
            className={styles.remove}
            onClick={() => onChange(value.filter((t) => t !== tag))}
            aria-label={`Remove tag ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        className={styles.input}
        value={draft}
        list={listId}
        disabled={full}
        placeholder={full ? `Up to ${MAX_TAGS} tags` : value.length ? 'Add another…' : 'e.g. remote, dream company'}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(',')) {
            v.split(',').slice(0, -1).forEach(add);
            setDraft(v.split(',').pop());
          } else {
            setDraft(v);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitDraft();
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commitDraft}
        enterKeyHint="done"
        autoComplete="off"
      />
      <datalist id={listId}>
        {suggestions
          .filter((s) => !value.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  );
}

export default TagInput;
