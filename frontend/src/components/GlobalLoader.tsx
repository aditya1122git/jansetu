import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { subscribeToApiActivity } from '../services/api';
import { Shield } from './icons';
import './GlobalLoader.css';

export const GlobalLoader: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToApiActivity(active => {
      if (active) {
        if (showTimer.current === null) {
          showTimer.current = window.setTimeout(() => {
            setVisible(true);
            showTimer.current = null;
          }, 250);
        }
        return;
      }

      if (showTimer.current !== null) {
        window.clearTimeout(showTimer.current);
        showTimer.current = null;
      }
      setVisible(false);
    });

    return () => {
      unsubscribe();
      if (showTimer.current !== null) window.clearTimeout(showTimer.current);
    };
  }, []);

  if (!visible) return null;

  return createPortal(
    <div className="global-loader" role="status" aria-live="polite" aria-label="Loading">
      <div className="global-loader-card">
        <span className="global-loader-brand"><Shield /></span>
        <span className="global-loader-spinner" aria-hidden="true" />
        <strong>Please wait...</strong>
        <small>Securely processing your request</small>
      </div>
    </div>,
    document.body
  );
};

export default GlobalLoader;
