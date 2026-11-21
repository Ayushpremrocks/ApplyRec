import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import styles from './Board.module.css';
import ApplicationCard, { DragHandleIcon } from './ApplicationCard';
import { STATUSES, STATUS_VAR } from '../utils/applications';

/** Keyboard drag: ←/→ jump a whole column instead of nudging by pixels. */
function columnCoordinates(event, { context }) {
  const { droppableRects, collisionRect } = context;
  if (!collisionRect || !['ArrowLeft', 'ArrowRight'].includes(event.code)) return undefined;
  event.preventDefault();
  const rects = [...droppableRects.values()].sort((a, b) => a.left - b.left);
  const centre = collisionRect.left + collisionRect.width / 2;
  let index = rects.findIndex((r) => centre >= r.left && centre <= r.left + r.width);
  if (index === -1) index = 0;
  index = event.code === 'ArrowRight' ? Math.min(index + 1, rects.length - 1) : Math.max(index - 1, 0);
  const target = rects[index];
  return { x: target.left + target.width / 2 - collisionRect.width / 2, y: target.top + 56 };
}

/** Prefer the column under the pointer; fall back to overlap (keyboard and edge cases). */
function collision(args) {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
}

const announcements = {
  onDragStart: ({ active }) => `Picked up ${active.data.current?.app.company}. Use left and right arrows to change status.`,
  onDragOver: ({ active, over }) =>
    over ? `${active.data.current?.app.company} is over ${over.id}.` : `${active.data.current?.app.company} is not over a column.`,
  onDragEnd: ({ active, over }) =>
    over ? `${active.data.current?.app.company} moved to ${over.id}.` : `${active.data.current?.app.company} was dropped.`,
  onDragCancel: ({ active }) => `Moving ${active.data.current?.app.company} was cancelled.`,
};

function DraggableCard({ app, cardProps }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: app.id, data: { app } });
  // Pointer/touch can grab anywhere on the card; the keyboard uses the handle button.
  const { onKeyDown, ...pointerListeners } = listeners || {};

  return (
    <div ref={setNodeRef} className={styles.draggable} {...pointerListeners}>
      <ApplicationCard
        application={app}
        isDragging={isDragging}
        {...cardProps}
        dragHandle={
          <button
            type="button"
            className={styles.handle}
            {...attributes}
            onKeyDown={onKeyDown}
            aria-label={`Move ${app.company} to another status`}
          >
            <DragHandleIcon />
          </button>
        }
      />
    </div>
  );
}

function Column({ status, apps, cardProps }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={`${styles.column} ${isOver ? styles.over : ''}`}
      style={{ '--status': STATUS_VAR[status] }}
      aria-labelledby={`col-${status}`}
    >
      <header className={styles.columnHeader}>
        <h3 id={`col-${status}`} className={styles.columnTitle}>
          <span className={styles.dot} aria-hidden="true" />
          {status}
        </h3>
        <span className={styles.count} aria-label={`${apps.length} applications`}>
          {apps.length}
        </span>
      </header>
      <div className={styles.cards}>
        {apps.map((app) => (
          <DraggableCard key={app.id} app={app} cardProps={cardProps} />
        ))}
        {apps.length === 0 && <div className={styles.empty}>Drop applications here</div>}
      </div>
    </section>
  );
}

/**
 * Kanban board. Presentational: a drop calls onStatusChange(application, newStatus) and the
 * parent owns the update. Works with mouse, touch (long-press) and keyboard.
 */
function Board({ applications, onStatusChange, ...cardProps }) {
  const [active, setActive] = useState(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinates })
  );

  const grouped = Object.fromEntries(STATUSES.map((s) => [s, []]));
  applications.forEach((app) => grouped[app.status]?.push(app));

  const allCardProps = { ...cardProps, onStatusChange };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      accessibility={{ announcements }}
      onDragStart={({ active: a }) => setActive(a.data.current.app)}
      onDragCancel={() => setActive(null)}
      onDragEnd={({ active: a, over }) => {
        setActive(null);
        const app = a.data.current.app;
        if (over && over.id !== app.status) onStatusChange(app, over.id);
      }}
    >
      <div className={styles.board}>
        {STATUSES.map((status) => (
          <Column key={status} status={status} apps={grouped[status]} cardProps={allCardProps} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className={styles.overlay}>
            <ApplicationCard application={active} {...allCardProps} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default Board;
