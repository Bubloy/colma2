import React, { useEffect, useState } from 'react';
import { store } from '../db/store';

export const OfflineSync: React.FC = () => {
  const [isOnline, setIsOnline] = useState(store.getState().isOnline);
  const [queueLength, setQueueLength] = useState(store.getState().offlineQueue.length);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
      setIsOnline(state.isOnline);
      setQueueLength(state.offlineQueue.length);
    });
    return unsubscribe;
  }, []);

  const handleToggle = () => {
    const newOnline = !isOnline;
    if (newOnline && queueLength > 0) {
      setSyncing(true);
      // Simulate high fidelity sync delay
      setTimeout(() => {
        store.setOnline(true);
        setSyncing(false);
      }, 1500);
    } else {
      store.setOnline(newOnline);
    }
  };

  return (
    <div className="glass-card" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '12px',
      borderRadius: '12px',
      border: `1px solid ${isOnline ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 82, 82, 0.3)'}`,
      boxShadow: `0 8px 32px ${isOnline ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 82, 82, 0.1)'}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: isOnline ? '#00E676' : '#FF5252', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Simulador de Red
        </span>
        <span className={`badge ${isOnline ? 'badge-success' : 'badge-danger'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Simular Conexión:</span>
        <button
          onClick={handleToggle}
          disabled={syncing}
          className={`btn ${isOnline ? 'btn-success' : 'btn-danger'}`}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: syncing ? 'not-allowed' : 'pointer'
          }}
        >
          {syncing ? 'Sincronizando...' : isOnline ? 'Desconectar' : 'Conectar'}
        </button>
      </div>

      {queueLength > 0 && (
        <div style={{
          marginTop: '6px',
          padding: '8px',
          background: 'rgba(255, 171, 0, 0.1)',
          border: '1px solid rgba(255, 171, 0, 0.2)',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#FFAB00',
          textAlign: 'center',
          animation: 'pulseGlow 2s infinite'
        }}>
          ⚠️ {queueLength} transacción{queueLength > 1 ? 'es' : ''} pendiente{queueLength > 1 ? 's' : ''} de subir.
        </div>
      )}
    </div>
  );
};
export default OfflineSync;
