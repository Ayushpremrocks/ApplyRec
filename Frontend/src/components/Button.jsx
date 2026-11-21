import React from 'react';
import styles from './Button.module.css';

/** variant: primary | secondary | ghost | danger. size: md | sm. block: full width. */
function Button({ children, variant = 'primary', size = 'md', block = false, type = 'button', className = '', ...props }) {
  return (
    <button
      type={type}
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${block ? styles.block : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
