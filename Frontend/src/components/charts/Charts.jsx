import React, { useId, useState } from 'react';
import styles from './Charts.module.css';

/** Card wrapper with a chart/table switch so every chart has an accessible table view. */
export function ChartCard({ title, subtitle, table, children, className = '' }) {
  const [showTable, setShowTable] = useState(false);
  const id = useId();
  return (
    <section className={`${styles.card} ${className}`} aria-labelledby={id}>
      <header className={styles.cardHeader}>
        <div>
          <h2 id={id} className={styles.cardTitle}>
            {title}
          </h2>
          {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
        </div>
        {table && (
          <button type="button" className={styles.toggle} aria-pressed={showTable} onClick={() => setShowTable((v) => !v)}>
            {showTable ? 'Chart' : 'Table'}
          </button>
        )}
      </header>
      {showTable ? table : children}
    </section>
  );
}

export function DataTable({ columns, rows }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={j}>{cell}</td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Horizontal bars, one series. Bars are anchored at zero with a rounded data end;
 * labels and values use text colours, the bar carries no meaning beyond length.
 */
export function BarList({ items, max, format = (v) => v, detail }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={styles.barList}>
      {items.map((item) => {
        const pct = top > 0 ? Math.max(0, Math.min(100, (item.value / top) * 100)) : 0;
        return (
          <li key={item.label} className={styles.barRow} tabIndex={0} aria-label={`${item.label}: ${format(item.value)}${detail ? `, ${detail(item)}` : ''}`}>
            <span className={styles.barLabel}>{item.label}</span>
            <span className={styles.barTrack} aria-hidden="true">
              <span className={styles.bar} style={{ width: `${pct}%` }} />
            </span>
            <span className={styles.barValue} aria-hidden="true">
              {format(item.value)}
              {detail && <span className={styles.barDetail}>{detail(item)}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function niceMax(v) {
  if (v <= 4) return Math.max(1, Math.ceil(v));
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** Vertical columns over time with a hover/focus tooltip and a recessive grid. */
export function ColumnChart({ data, labelFor, tooltipFor, ariaLabel }) {
  const [active, setActive] = useState(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = max <= 4 ? Array.from({ length: max + 1 }, (_, i) => i) : [0, max / 2, max];
  const labelEvery = data.length > 8 ? 2 : 1;

  return (
    <div className={styles.columnChart} role="group" aria-label={ariaLabel}>
      <div className={styles.plot}>
        <div className={styles.yAxis} aria-hidden="true">
          {[...ticks].reverse().map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className={styles.plotArea} onMouseLeave={() => setActive(null)}>
          {ticks.map((t) => (
            <span key={t} className={styles.gridline} style={{ bottom: `${(t / max) * 100}%` }} aria-hidden="true" />
          ))}
          <div className={styles.columns}>
            {data.map((d, i) => (
              <button
                type="button"
                key={i}
                className={`${styles.columnHit} ${active === i ? styles.columnActive : ''}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={tooltipFor(d)}
              >
                <span className={styles.column} style={{ height: `${(d.value / max) * 100}%` }} />
                {active === i && (
                  <span className={styles.tooltip} role="tooltip">
                    {tooltipFor(d)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.xAxis} aria-hidden="true">
        {data.map((d, i) => (
          <span key={i} data-major={(data.length - 1 - i) % 4 === 0 ? '' : undefined}>
            {i % labelEvery === (data.length - 1) % labelEvery ? labelFor(d) : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A headline number. */
export function StatTile({ label, value, hint }) {
  return (
    <div className={styles.tile}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>{value}</span>
      {hint && <span className={styles.tileHint}>{hint}</span>}
    </div>
  );
}
