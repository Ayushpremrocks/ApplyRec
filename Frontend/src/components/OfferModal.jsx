import React from 'react';
import styles from './OfferModal.module.css';
import Modal from './Modal';
import Button from './Button';

/** Confirms an Offer before celebrating ("Just testing" leaves the status unchanged). */
function OfferModal({ companyName, onConfirm, onCancel }) {
  return (
    <Modal
      title="Did you get an offer?"
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Just testing
          </Button>
          <Button onClick={onConfirm} data-autofocus>
            Yes, I got the offer!
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <div className={styles.emoji} aria-hidden="true">
          🤔
        </div>
        <p>
          Did you actually receive an offer from <strong>{companyName}</strong>?
        </p>
      </div>
    </Modal>
  );
}

export default OfferModal;
