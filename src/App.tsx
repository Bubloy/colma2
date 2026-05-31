import { useState, useEffect } from 'react';
import { store } from './db/store';
import type { AppState } from './db/store';
import POS from './components/POS';
import FiaoManager from './components/FiaoManager';
import Inventory from './components/Inventory';
import DeliveryDashboard from './components/DeliveryDashboard';
import Analytics from './components/Analytics';
import RoleSwitcher from './components/RoleSwitcher';
import OfflineSync from './components/OfflineSync';
import Onboarding from './components/Onboarding';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'danger' | 'warning';
}

export function App() {
  const [state, setState] = useState<AppState>(store.getState());
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [toasts, setToasts] = useState<Toast[]>([]);

  if (!state.colmadoSettings.isRegistered) {
    return <Onboarding />;
  }

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
      
      // Enforce role-based tab restrictions
      if (newState.activeRole === 'Cajero') {
        setActiveTab('pos');
      } else if (newState.activeRole === 'Delivery') {
        setActiveTab('delivery');
      }
    });
    return unsubscribe;
  }, []);

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Automatically dismiss toast after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Render active component based on selected tab and active role permissions
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'pos':
        return <POS addToast={addToast} />;
      case 'fiao':
        return state.activeRole === 'Super Admin' ? (
          <FiaoManager addToast={addToast} />
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-danger)', fontWeight: 'bold' }}>
            🔒 Acceso restringido. Solo disponible para Súper Administrador.
          </div>
        );
      case 'inventory':
        return state.activeRole === 'Super Admin' ? (
          <Inventory addToast={addToast} />
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-danger)', fontWeight: 'bold' }}>
            🔒 Acceso restringido. Solo disponible para Súper Administrador.
          </div>
        );
      case 'delivery':
        return <DeliveryDashboard addToast={addToast} />;
      case 'analytics':
        return state.activeRole === 'Super Admin' ? (
          <Analytics addToast={addToast} />
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-danger)', fontWeight: 'bold' }}>
            🔒 Acceso restringido. Solo disponible para Súper Administrador.
          </div>
        );
      default:
        return <POS addToast={addToast} />;
    }
  };

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`} onClick={() => removeToast(toast.id)}>
            <span>
              {toast.type === 'success' && '✅'}
              {toast.type === 'info' && '🔵'}
              {toast.type === 'warning' && '⚠️'}
              {toast.type === 'danger' && '❌'}
            </span>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{toast.message}</div>
          </div>
        ))}
      </div>

      {/* Main Header / Navigation */}
      <header>
        <div className="logo-container">
          <div className="logo-icon">{state.colmadoSettings.name ? state.colmadoSettings.name.charAt(0) : 'C'}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="logo-text">{state.colmadoSettings.name || 'Colma2'}</span>
              <span className="domain-pill" style={{ textTransform: 'uppercase' }}>RNC: {state.colmadoSettings.rnc}</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🇩🇴 {state.colmadoSettings.address} | <span style={{ color: state.isOnline ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 'bold' }}>
                {state.isOnline ? '● En Línea' : '● Fuera de Línea'}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation according to Role */}
        <nav>
          {state.activeRole === 'Super Admin' && (
            <>
              <button
                onClick={() => setActiveTab('pos')}
                className={`nav-btn ${activeTab === 'pos' ? 'active' : ''}`}
              >
                🛒 Ventas POS
              </button>
              <button
                onClick={() => setActiveTab('fiao')}
                className={`nav-btn ${activeTab === 'fiao' ? 'active' : ''}`}
              >
                ✍️ Cuentas Fiao
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`nav-btn ${activeTab === 'inventory' ? 'active' : ''}`}
              >
                📦 Almacén
              </button>
              <button
                onClick={() => setActiveTab('delivery')}
                className={`nav-btn ${activeTab === 'delivery' ? 'active' : ''}`}
              >
                🏍️ Delivery GPS
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              >
                📊 Finanzas
              </button>
            </>
          )}

          {state.activeRole === 'Cajero' && (
            <button
              onClick={() => setActiveTab('pos')}
              className={`nav-btn active`}
            >
              🛒 Punto de Venta (POS) - Cajero Activo
            </button>
          )}

          {state.activeRole === 'Delivery' && (
            <button
              onClick={() => setActiveTab('delivery')}
              className={`nav-btn active`}
            >
              🏍️ Rutas de Reparto - Delivery Activo
            </button>
          )}
        </nav>

        {/* Global info pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {state.activeRole === 'Super Admin' ? (state.colmadoSettings.name ? `${state.colmadoSettings.name} (Admin)` : 'Administrador') : state.activeRole === 'Cajero' ? 'Cajera Lorena' : 'Rider Brayan'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Rol: {state.activeRole}
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-purple) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#FFFFFF', fontSize: '18px', boxShadow: 'var(--shadow-accent)' }}>
            {state.activeRole.charAt(0)}
          </div>
        </div>
      </header>

      {/* Offline Alert Banner */}
      {!state.isOnline && (
        <div className="offline-banner" style={{ margin: '12px 24px 0 24px' }}>
          ⚠️ <strong>Modo Sin Conexión Activado:</strong> Las ventas se registrarán localmente de forma segura y se sincronizarán al reconectar.
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {renderActiveTab()}
      </main>

      {/* Floating control widgets for simulations */}
      <div className="floating-widget">
        <OfflineSync />
        <RoleSwitcher />
      </div>
    </div>
  );
}
export default App;
