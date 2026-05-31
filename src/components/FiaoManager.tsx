import React, { useState, useEffect } from 'react';
import { store } from '../db/store';
import type { AppState } from '../db/store';

interface FiaoManagerProps {
  addToast: (message: string, type: 'success' | 'info' | 'danger' | 'warning') => void;
}

export const FiaoManager: React.FC<FiaoManagerProps> = ({ addToast }) => {
  const [state, setState] = useState<AppState>(store.getState());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [showWhatsAppSim, setShowWhatsAppSim] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState<number>(3000);

  const [abonoAmount, setAbonoAmount] = useState<number | ''>('');

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
      // Select first client if none selected
      if (!selectedClientId && newState.clients.length > 0) {
        setSelectedClientId(newState.clients[0].id);
      }
    });
    return unsubscribe;
  }, [selectedClientId]);

  const filteredClients = state.clients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.nickname && c.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedClient = state.clients.find((c) => c.id === selectedClientId);

  // Client transactions (Fiao sales and abonos)
  const clientTransactions = state.sales.filter((s) => s.clientId === selectedClientId);

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) {
      addToast('Nombre y Teléfono son requeridos', 'warning');
      return;
    }

    const newClient = store.registerClient({
      name: newName,
      nickname: newNickname || undefined,
      phone: newPhone,
      creditLimit: Number(newCreditLimit)
    });

    addToast(`Cliente "${newClient.nickname || newClient.name}" registrado con éxito`, 'success');
    setSelectedClientId(newClient.id);
    
    // Clear forms
    setNewName('');
    setNewNickname('');
    setNewPhone('');
    setNewCreditLimit(3000);
    setShowAddModal(false);
  };

  const handleAbonoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !abonoAmount || abonoAmount <= 0) {
      addToast('Monto de abono inválido', 'warning');
      return;
    }

    if (!state.currentJournalId) {
      addToast('Debes abrir la caja registradora para registrar ingresos por abonos', 'danger');
      return;
    }

    store.recordAbono(selectedClientId, Number(abonoAmount));
    addToast(`Abono de RD$${abonoAmount} registrado para ${selectedClient?.nickname || selectedClient?.name}`, 'success');
    
    setAbonoAmount('');
    setShowAbonoModal(false);
  };

  // Pre-configured Dominican WhatsApp template
  const getWhatsAppMessage = () => {
    if (!selectedClient) return '';
    const date = new Date().toLocaleDateString('es-DO');
    return `Hola ${selectedClient.nickname || selectedClient.name}, le saludamos de Colma2. Le recordamos que su balance pendiente de fiao al día de hoy (${date}) es de *RD$ ${selectedClient.balance}* de un límite de RD$ ${selectedClient.creditLimit}.\n\nPuede pasar a abonar por el colmado o solicitar por delivery. ¡Muchas gracias por su preferencia! 🏍️🇩🇴`;
  };

  const triggerRealWhatsApp = () => {
    if (!selectedClient) return;
    // Format text
    const text = encodeURIComponent(getWhatsAppMessage());
    // WhatsApp web link
    const url = `https://web.whatsapp.com/send?phone=${selectedClient.phone.replace(/[^0-9+]/g, '')}&text=${text}`;
    window.open(url, '_blank');
    addToast('Redirigiendo a WhatsApp Web...', 'info');
    setShowWhatsAppSim(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
      
      {/* Left panel: Clients list */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px', margin: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--color-purple)' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Clientes (Fiao)
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-purple"
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '11px' }}
          >
            + Nuevo
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control"
          style={{ padding: '8px 12px', fontSize: '13px' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
          {filteredClients.map((client) => {
            const usagePercent = Math.min(100, Math.round((client.balance / client.creditLimit) * 100));
            const isSelected = client.id === selectedClientId;
            
            // Health indicator color
            let statusColor = 'var(--text-secondary)';
            if (client.balance > 0) {
              if (usagePercent >= 90) statusColor = 'var(--color-danger)';
              else if (usagePercent >= 70) statusColor = 'var(--color-warning)';
              else statusColor = 'var(--color-success)';
            }

            return (
              <div
                key={client.id}
                onClick={() => setSelectedClientId(client.id)}
                className="glass-card"
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--color-purple)' : '1px solid var(--glass-border)',
                  background: isSelected ? 'rgba(157, 78, 221, 0.05)' : 'var(--bg-secondary)',
                  transition: 'var(--transition)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>
                    {client.nickname || client.name}
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: statusColor }}>
                    RD$ {client.balance}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Límite: RD$ {client.creditLimit}</span>
                  <span>{usagePercent}%</span>
                </div>

                {/* Progress bar representing credit status */}
                <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${usagePercent}%`,
                    height: '100%',
                    background: statusColor,
                    borderRadius: '3px'
                  }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel: Details and actions */}
      <div className="glass-card accent-purple" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {selectedClient ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '24px', color: 'var(--text-primary)' }}>{selectedClient.name}</h3>
                {selectedClient.nickname && (
                  <p style={{ color: 'var(--color-purple)', fontWeight: 'bold', fontSize: '14px' }}>
                    Apodo: "{selectedClient.nickname}"
                  </p>
                )}
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                  📞 Celular: {selectedClient.phone}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowAbonoModal(true)}
                  className="btn btn-success"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  💵 Registrar Abono
                </button>
                <button
                  onClick={() => setShowWhatsAppSim(true)}
                  className="btn btn-purple"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  💬 Recordar WhatsApp
                </button>
              </div>
            </div>

            {/* Financial indicators for specific client */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)', textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Balance Pendiente</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-danger)' }}>RD$ {selectedClient.balance}</div>
              </div>
              <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)', textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Límite Otorgado</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-purple)' }}>RD$ {selectedClient.creditLimit}</div>
              </div>
              <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)', textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Crédito Disponible</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-success)' }}>
                  RD$ {Math.max(0, selectedClient.creditLimit - selectedClient.balance)}
                </div>
              </div>
            </div>

            {/* Transactions History */}
            <div>
              <h4 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '10px' }}>Historial de Deuda y Abonos</h4>
              <div className="table-container" style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                {clientTransactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)' }}>
                    No hay transacciones registradas para este cliente.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Operación</th>
                        <th>Detalle</th>
                        <th style={{ textAlign: 'right' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientTransactions.map((t) => {
                        const isAbono = t.total < 0;
                        return (
                          <tr key={t.id}>
                            <td>{new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td>
                              <span className={`badge ${isAbono ? 'badge-success' : 'badge-danger'}`}>
                                {isAbono ? 'ABONO' : 'FIAO'}
                              </span>
                            </td>
                            <td style={{ fontSize: '13px' }}>
                              {isAbono 
                                ? 'Ingreso por abono a cuenta' 
                                : t.items.map(item => `${item.quantity}x ${item.name}`).join(', ')
                              }
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: isAbono ? 'var(--color-success)' : 'var(--color-danger)' }}>
                              RD$ {Math.abs(t.total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
            Selecciona un cliente de la lista de la izquierda para gestionar su cuenta.
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={() => setShowAddModal(false)} className="modal-close">×</button>
            <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>Registrar Nuevo Cliente (Fiazo)</h3>
            <form onSubmit={handleAddClient}>
              <div className="form-group">
                <label>Nombre Completo:</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="form-control"
                  placeholder="Ej: Ramón Mercedes"
                />
              </div>
              <div className="form-group">
                <label>Apodo / Cómo le conocen (Opcional):</label>
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  className="form-control"
                  placeholder="Ej: Don Ramón El Cojo"
                />
              </div>
              <div className="form-group">
                <label>Celular / WhatsApp (Dominicano):</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="form-control"
                  placeholder="Ej: +18095552345"
                />
              </div>
              <div className="form-group">
                <label>Límite de Crédito Permitido (RD$):</label>
                <input
                  type="number"
                  required
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(Number(e.target.value))}
                  className="form-control"
                  placeholder="Ej: 3000"
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-purple" style={{ flex: 1 }}>
                  Guardar Cliente
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Abono Modal */}
      {showAbonoModal && selectedClient && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={() => setShowAbonoModal(false)} className="modal-close">×</button>
            <h3 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}>Registrar Abono</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              Registra un pago para abonar a la cuenta de <strong>{selectedClient.nickname || selectedClient.name}</strong>.
              <br />
              Balance Actual: <strong>RD$ {selectedClient.balance}</strong>
            </p>
            <form onSubmit={handleAbonoSubmit}>
              <div className="form-group">
                <label>Monto a Abonar (RD$):</label>
                <input
                  type="number"
                  required
                  max={selectedClient.balance}
                  value={abonoAmount}
                  onChange={(e) => setAbonoAmount(e.target.value ? Number(e.target.value) : '')}
                  className="form-control"
                  placeholder="Ej: 500"
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>
                  Confirmar Abono
                </button>
                <button type="button" onClick={() => setShowAbonoModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Chat Simulator Modal */}
      {showWhatsAppSim && selectedClient && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', padding: '0px', overflow: 'hidden', borderRadius: '24px', border: '1px solid rgba(0,230,118,0.2)' }}>
            
            {/* Phone Screen Top Header */}
            <div style={{ background: '#075E54', color: 'var(--text-primary)', padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'var(--text-primary)', color: '#075E54', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                {selectedClient.nickname ? selectedClient.nickname.charAt(0) : selectedClient.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{selectedClient.nickname || selectedClient.name}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>en línea</div>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div style={{
              background: '#ECE5DD',
              padding: '16px',
              height: '300px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              backgroundImage: 'radial-gradient(#DFD3C3 10%, transparent 10%)',
              backgroundSize: '16px 16px'
            }}>
              {/* Automated pre-typed message bubble */}
              <div style={{
                background: '#DCF8C6',
                color: '#303030',
                padding: '10px',
                borderRadius: '8px',
                maxWidth: '85%',
                alignSelf: 'flex-end',
                fontSize: '12px',
                boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
                marginBottom: '10px',
                lineHeight: '1.4',
                whiteSpace: 'pre-line'
              }}>
                {getWhatsAppMessage()}
                <div style={{ fontSize: '8px', color: '#666', textAlign: 'right', marginTop: '4px' }}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✔✔
                </div>
              </div>
            </div>

            {/* Phone Bottom Actions */}
            <div style={{ background: 'var(--text-primary)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #DDD' }}>
              <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
                Simular envío automático a <strong>{selectedClient.phone}</strong>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={triggerRealWhatsApp}
                  className="btn btn-success"
                  style={{ flex: 1, padding: '10px', fontSize: '12px' }}
                >
                  🟢 Abrir WhatsApp Web
                </button>
                <button
                  onClick={() => {
                    addToast('Recordatorio simulado enviado por WhatsApp con éxito', 'success');
                    setShowWhatsAppSim(false);
                  }}
                  className="btn btn-purple"
                  style={{ flex: 1, padding: '10px', fontSize: '12px' }}
                >
                  🤖 Simular Envío
                </button>
              </div>
              <button
                onClick={() => setShowWhatsAppSim(false)}
                className="btn btn-secondary"
                style={{ padding: '6px', fontSize: '11px' }}
              >
                Cerrar Pantalla
              </button>
            </div>
            
          </div>
        </div>
      )}
      
    </div>
  );
};
export default FiaoManager;
