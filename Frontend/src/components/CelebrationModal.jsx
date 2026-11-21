import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import styles from './CelebrationModal.module.css';
import Modal from './Modal';
import Button from './Button';

const COLORS = ['#a3e635', '#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#f87171'];

function CelebrationModal({ companyName, onClose }) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.5,
        duration: 2.5 + Math.random() * 2,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 8,
      })),
    []
  );

  return (
    <>
      {createPortal(
        <div className={styles.confetti} aria-hidden="true">
          {confetti.map((p) => (
            <span
              key={p.id}
              style={{
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                background: p.color,
                width: p.size,
                height: p.size * 0.6,
              }}
            />
          ))}
        </div>,
        document.body
      )}
      <Modal
        title="Congratulations!"
        size="sm"
        onClose={onClose}
        footer={
          <Button onClick={onClose} block data-autofocus>
            Thanks! Let's go!
          </Button>
        }
      >
        <div className={styles.body}>
          <div className={styles.emoji} aria-hidden="true">
            🎉🥳🎊
          </div>
          <p className={styles.lead}>You got an offer from</p>
          <p className={styles.company}>{companyName}</p>
          <p className={styles.message}>All your hard work paid off. Take a moment to celebrate — you earned it!</p>
        </div>
      </Modal>
    </>
  );
}

export default CelebrationModal;
