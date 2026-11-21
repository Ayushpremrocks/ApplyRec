import React, { useState } from 'react';
import styles from './TrelloBoard.module.css';
import ApplicationCard from './ApplicationCard';
import { STATUSES, STATUS_COLORS } from '../utils/applications';

/**
 * Presentational Kanban board. It never calls the API itself: dropping a card calls
 * onStatusChange(application, newStatus) and the Dashboard owns the update.
 */
function TrelloBoard({ applications, onEdit, onDelete, onStatusChange }) {
  const [draggedCard, setDraggedCard] = useState(null);
  const [targetColumn, setTargetColumn] = useState(null);

  const grouped = Object.fromEntries(STATUSES.map((s) => [s, []]));
  applications.forEach((app) => grouped[app.status]?.push(app));

  const handleDragStart = (e, application) => {
    setDraggedCard(application);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(application.id));
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (targetColumn !== status) setTargetColumn(status);
  };

  const handleDragLeave = (e) => {
    // Ignore leave events fired when moving between children of the same column.
    if (!e.currentTarget.contains(e.relatedTarget)) setTargetColumn(null);
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    setTargetColumn(null);
    const card = draggedCard;
    setDraggedCard(null);
    if (card && card.status !== status) {
      onStatusChange(card, status);
    }
  };

  return (
    <div className={styles.board}>
      {STATUSES.map((status) => (
        <div
          key={status}
          className={`${styles.column} ${targetColumn === status ? styles.dragOver : ''}`}
          onDragOver={(e) => handleDragOver(e, status)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, status)}
        >
          <div className={styles.columnHeader} style={{ borderTopColor: STATUS_COLORS[status] }}>
            <h3 className={styles.columnTitle}>{status}</h3>
            <span className={styles.columnCount}>{grouped[status].length}</span>
          </div>
          <div className={styles.columnContent}>
            {grouped[status].map((app) => (
              <div
                key={app.id}
                draggable
                onDragStart={(e) => handleDragStart(e, app)}
                onDragEnd={() => setDraggedCard(null)}
                className={styles.draggableCard}
              >
                <ApplicationCard application={app} onEdit={onEdit} onDelete={onDelete} />
              </div>
            ))}
            {grouped[status].length === 0 && (
              <div className={styles.emptyColumn}>Drop applications here</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default TrelloBoard;
