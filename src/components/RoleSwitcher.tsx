import React, { useEffect, useState } from 'react';
import { store } from '../db/store';
import PinPrompt from './PinPrompt';

export const RoleSwitcher: React.FC = () => {
  const [role, setRole] = useState(store.getState().activeRole);
  const [colmadoSettings, setColmadoSettings] = useState(store.getState().colmadoSettings);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pendingRole, setPendingRole] = useState<typeof role | null>(null);

  useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
      setRole(state.activeRole);
      setColmadoSettings(state.colmadoSettings);
    });
    return unsubscribe;
  }, []);

  const handleRoleChange = (newRole: typeof role) => {
    if (newRole === 'Super Admin' && role !== 'Super Admin') {
      setPendingRole(newRole);
      setShowPinPrompt(true);
    } else {
      store.setRole(newRole);
    }
  };

  const handlePinSuccess = () => {
    if (pendingRole) {
      store.setRole(pendingRole);
    }
    setPendingRole(null);
    setShowPinPrompt(false);
  };

  return (
    <>
      <div className="glass-card" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        borderRadius: '12px',
        border: '1px solid rgba(157, 78, 221, 0.3)',
        boxShadow: '0 8px 32px rgba(157, 78, 221, 0.15)'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#9D4EDD', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Simulador de Roles
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['Super Admin', 'Cajero', 'Delivery'] as const).map((r) => (
            <button
              key={r}
              onClick={() => handleRoleChange(r)}
              className={`btn ${role === r ? 'btn-purple' : 'btn-secondary'}`}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                fontWeight: 600
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {showPinPrompt && (
        <PinPrompt
          correctPin={colmadoSettings.adminPin}
          onSuccess={handlePinSuccess}
          onCancel={() => {
            setPendingRole(null);
            setShowPinPrompt(false);
          }}
          title="Cambiar a Rol Súper Administrador"
          message="Ingrese el PIN administrativo para desbloquear todos los paneles."
        />
      )}
    </>
  );
};
export default RoleSwitcher;
