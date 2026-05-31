import React, { useEffect, useState } from 'react';
import { store } from '../db/store';

export const RoleSwitcher: React.FC = () => {
  const [role, setRole] = useState(store.getState().activeRole);

  useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
      setRole(state.activeRole);
    });
    return unsubscribe;
  }, []);

  const handleRoleChange = (newRole: typeof role) => {
    store.setRole(newRole);
  };

  return (
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
  );
};
export default RoleSwitcher;
