import React, { useState, useEffect } from 'react';
import { store } from '../db/store';
import type { AppState } from '../db/store';
import { DOMINICAN_SECTORS, DELIVERYS } from '../db/mockData';
import type { Delivery } from '../db/mockData';

interface DeliveryProps {
  addToast: (message: string, type: 'success' | 'info' | 'danger' | 'warning') => void;
}

export const DeliveryDashboard: React.FC<DeliveryProps> = ({ addToast }) => {
  const [state, setState] = useState<AppState>(store.getState());
  const [selectedRiderId, setSelectedRiderId] = useState(DELIVERYS[0].name);
  
  // Admin allocation state
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [sectorInput, setSectorInput] = useState('Naco');
  const [assignedRider, setAssignedRider] = useState(DELIVERYS[0].name);

  // Delivery path animation state
  const [animatedDeliveryId, setAnimatedDeliveryId] = useState<string | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
      // Auto fill address and phone if sale selected
      if (selectedSaleId) {
        const sale = newState.sales.find(s => s.id === selectedSaleId);
        if (sale) {
          setPhoneInput(sale.clientId ? newState.clients.find(c => c.id === sale.clientId)?.phone || '' : '');
        }
      }
    });
    return unsubscribe;
  }, [selectedSaleId]);

  // Handle assigning delivery
  const handleAssignDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleId || !addressInput || !phoneInput) {
      addToast('Por favor completa los detalles de asignación', 'warning');
      return;
    }

    const sector = DOMINICAN_SECTORS.find(s => s.name === sectorInput) || DOMINICAN_SECTORS[0];
    
    store.assignDelivery(
      selectedSaleId,
      `${addressInput} (${sectorInput})`,
      phoneInput,
      assignedRider,
      { x: sector.x, y: sector.y }
    );

    addToast(`Pedido asignado a ${assignedRider} para entrega en ${sectorInput}`, 'success');
    
    // Clear form
    setSelectedSaleId('');
    setAddressInput('');
    setPhoneInput('');
  };

  // Filter deliveries based on role and selected rider
  const riderDeliveries = state.deliveries.filter(d => 
    state.activeRole === 'Super Admin' ? true : d.riderName === selectedRiderId
  );

  // Trigger motorcycle delivery path animation
  const startDeliveryRouteAnimation = (d: Delivery) => {
    setAnimatedDeliveryId(d.id);
    setAnimationProgress(0);
    addToast(`¡Delivery ${d.riderName} salió en camino a ${d.address}!`, 'info');

    // Simulate real-time tracking update
    store.updateDeliveryStatus(d.id, 'En Camino');

    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setAnimationProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        store.updateDeliveryStatus(d.id, 'Entregado');
        addToast(`El pedido de ${d.clientName} fue entregado con éxito`, 'success');
        setAnimatedDeliveryId(null);
      }
    }, 250);
  };

  // Central point of the colmado on map
  const colmadoCoords = { x: 300, y: 250 };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '20px' }}>
      
      {/* Left panel: Admin Panel or Rider Active Jobs list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {state.activeRole === 'Super Admin' && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2>Despachar Delivery (Dueño / Administrador)</h2>
            
            {/* Filter sales that don't have delivery yet and are not Fiao only or are deliverable */}
            {state.sales.filter(s => !s.deliveryId && s.total > 0).length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                No hay pedidos de venta pendientes de asignación de delivery. Realiza una venta en el POS.
              </p>
            ) : (
              <form onSubmit={handleAssignDelivery} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Seleccionar Pedido POS:</label>
                    <select
                      value={selectedSaleId}
                      onChange={(e) => setSelectedSaleId(e.target.value)}
                      className="form-control"
                      style={{ fontSize: '13px' }}
                    >
                      <option value="">-- Seleccionar Venta --</option>
                      {state.sales.filter(s => !s.deliveryId && s.total > 0).map(s => (
                        <option key={s.id} value={s.id}>
                          Venta {s.id.substr(2, 4)} - {s.clientName || 'Cliente Genérico'} (RD$ {s.total})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Asignar Repartidor ("Delivery"):</label>
                    <select
                      value={assignedRider}
                      onChange={(e) => setAssignedRider(e.target.value)}
                      className="form-control"
                      style={{ fontSize: '13px' }}
                    >
                      {DELIVERYS.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Dirección del Cliente:</label>
                    <input
                      type="text"
                      required
                      placeholder="Calle, No. de Apto/Casa"
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label>Sector SD:</label>
                    <select
                      value={sectorInput}
                      onChange={(e) => setSectorInput(e.target.value)}
                      className="form-control"
                    >
                      {DOMINICAN_SECTORS.map(s => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Número de Contacto:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 809-555-1234"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="form-control"
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '40px', fontSize: '13px' }}>
                  🏍️ Despachar a Ruta de Entrega
                </button>
              </form>
            )}
          </div>
        )}

        {/* Deliveries list container */}
        <div className="glass-card accent-primary" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>
              {state.activeRole === 'Delivery' ? 'Mis Entregas Asignadas' : 'Estatus General de Delivery'}
            </h2>

            {state.activeRole === 'Delivery' && (
              <select
                value={selectedRiderId}
                onChange={(e) => setSelectedRiderId(e.target.value)}
                className="form-control"
                style={{ width: '180px', padding: '4px 10px', height: '30px', fontSize: '12px' }}
              >
                {DELIVERYS.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          {riderDeliveries.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>
              No hay repartos registrados en este momento.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
              {riderDeliveries.map((delivery) => {
                let badgeClass = 'badge-purple';
                if (delivery.status === 'En Camino') badgeClass = 'badge-warning';
                else if (delivery.status === 'Entregado') badgeClass = 'badge-success';

                const isAnimatingThis = animatedDeliveryId === delivery.id;

                return (
                  <div
                    key={delivery.id}
                    className="glass-card"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.01)',
                      border: isAnimatingThis ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-primary)' }}>
                          Para: {delivery.clientName}
                        </span>
                        <span className={`badge ${badgeClass}`}>{delivery.status}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📍 {delivery.address}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                        Repartidor: <strong>{delivery.riderName}</strong> | Tel: {delivery.phone}
                      </p>
                    </div>

                    {delivery.status !== 'Entregado' && (
                      <button
                        onClick={() => startDeliveryRouteAnimation(delivery)}
                        disabled={animatedDeliveryId !== null}
                        className="btn btn-primary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '11px',
                          borderRadius: '8px',
                          cursor: animatedDeliveryId !== null ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isAnimatingThis ? 'En camino...' : '🏍️ Iniciar Ruta'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Premium Animated GPS SVG Map of Santo Domingo */}
      <div className="glass-card accent-purple" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '400px' }}>
        <div>
          <h3>GPS de Reparto Colma2</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Mapa en tiempo real de los repartidores moviéndose por las avenidas de Santo Domingo.
          </p>
        </div>

        {/* Dynamic SVG Map */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--glass-border)', overflow: 'hidden', height: '400px', position: 'relative' }}>
          <svg width="100%" height="100%" viewBox="0 0 600 500" style={{ background: 'var(--bg-secondary)' }}>
            
            {/* Grid background lines */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="600" height="500" fill="url(#grid)" />

            {/* Stylized SD streets grid */}
            <path d="M 50 100 L 550 100 M 50 200 L 550 200 M 50 300 L 550 300 M 50 400 L 550 400" className="svg-street" />
            <path d="M 100 50 L 100 450 M 200 50 L 200 450 M 300 50 L 300 450 M 400 50 L 400 450 M 500 50 L 500 450" className="svg-street" />

            {/* Avenues (diagonal/organic) */}
            <path d="M 50 450 L 550 50" className="svg-street" style={{ strokeWidth: '4px', stroke: 'rgba(0, 240, 255, 0.15)' }} /> {/* Av. 27 de Febrero */}
            <path d="M 50 50 L 550 450" className="svg-street" style={{ strokeWidth: '4px', stroke: 'rgba(0, 240, 255, 0.15)' }} /> {/* Av. J.F. Kennedy */}

            {/* Sectors Polygons representation */}
            {DOMINICAN_SECTORS.map((s) => (
              <g key={s.name}>
                <circle cx={s.x} cy={s.y} r="25" className="svg-sector" />
                <text
                  x={s.x}
                  y={s.y + 35}
                  textAnchor="middle"
                  fill="var(--text-secondary)"
                  style={{ fontSize: '10px', fontWeight: 'bold', pointerEvents: 'none' }}
                >
                  {s.name}
                </text>
              </g>
            ))}

            {/* Colmado base marker */}
            <circle cx={colmadoCoords.x} cy={colmadoCoords.y} r="10" fill="var(--color-purple)" style={{ filter: 'drop-shadow(0 0 10px var(--color-purple))' }} />
            <text x={colmadoCoords.x} y={colmadoCoords.y - 15} textAnchor="middle" fill="#FFF" style={{ fontSize: '11px', fontWeight: 'extrabold', letterSpacing: '0.5px' }}>
              🏪 Colma2
            </text>

            {/* Active Delivery route drawing */}
            {riderDeliveries.map(d => {
              if (d.status === 'En Camino' || d.status === 'Entregado') {
                const targetCoords = d.coordinates || colmadoCoords;
                
                // Draw route line from colmado to client address
                return (
                  <path
                    key={`route-${d.id}`}
                    d={`M ${colmadoCoords.x} ${colmadoCoords.y} L ${targetCoords.x} ${targetCoords.y}`}
                    className="svg-route"
                    style={{ stroke: d.status === 'Entregado' ? 'var(--color-success)' : 'var(--color-accent)' }}
                  />
                );
              }
              return null;
            })}

            {/* Animated Motorcycle Marker */}
            {riderDeliveries.map(d => {
              if (d.status === 'En Camino' && d.id === animatedDeliveryId) {
                const targetCoords = d.coordinates || colmadoCoords;
                
                // Calculate current position based on progress percentage
                const currentX = colmadoCoords.x + (targetCoords.x - colmadoCoords.x) * (animationProgress / 100);
                const currentY = colmadoCoords.y + (targetCoords.y - colmadoCoords.y) * (animationProgress / 100);

                return (
                  <g key={`motor-${d.id}`} className="svg-marker">
                    {/* Pulsing glow ring */}
                    <circle cx={currentX} cy={currentY} r="12" fill="none" stroke="var(--color-accent)" strokeWidth="2" opacity="0.6">
                      <animate attributeName="r" values="8;18;8" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    {/* Bike Marker */}
                    <circle cx={currentX} cy={currentY} r="7" fill="var(--color-accent)" />
                    {/* Label */}
                    <rect x={currentX - 25} y={currentY - 26} width="50" height="15" rx="3" fill="#0A0E17" stroke="var(--color-accent)" strokeWidth="1" />
                    <text x={currentX} y={currentY - 16} textAnchor="middle" fill="#00F0FF" style={{ fontSize: '8px', fontWeight: 'bold' }}>
                      🏍️ Reparto
                    </text>
                  </g>
                );
              }

              // static flag for delivered
              if (d.status === 'Entregado' && d.coordinates) {
                return (
                  <g key={`delivered-flag-${d.id}`}>
                    <circle cx={d.coordinates.x} cy={d.coordinates.y} r="5" fill="var(--color-success)" />
                    <text x={d.coordinates.x} y={d.coordinates.y - 12} textAnchor="middle" fill="var(--color-success)" style={{ fontSize: '9px', fontWeight: 'bold' }}>
                      ✅ OK
                    </text>
                  </g>
                );
              }
              return null;
            })}

          </svg>
          
          {/* Floating map legend */}
          <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(5,7,12,0.85)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)', fontSize: '10px', display: 'flex', gap: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', background: 'var(--color-purple)', borderRadius: '50%' }}></span> Base (Colma2)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', background: 'var(--color-accent)', borderRadius: '50%' }}></span> En Ruta
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', background: 'var(--color-success)', borderRadius: '50%' }}></span> Entregado
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
export default DeliveryDashboard;
