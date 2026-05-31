import React, { useState, useEffect } from 'react';
import { store } from '../db/store';
import type { AppState } from '../db/store';

interface AnalyticsProps {
  addToast: (message: string, type: 'success' | 'info' | 'danger' | 'warning') => void;
}

export const Analytics: React.FC<AnalyticsProps> = ({ addToast }) => {
  const [state, setState] = useState<AppState>(store.getState());
  const [openingBalance, setOpeningBalance] = useState<number | ''>('');
  const [expenses, setExpenses] = useState<number | ''>('');
  const [actualBalance, setActualBalance] = useState<number | ''>('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const activeJournal = state.journals.find(j => j.id === state.currentJournalId && !j.closedAt);

  // Financial aggregates
  const totalSales = state.sales.reduce((acc, s) => acc + (s.total > 0 ? s.total : 0), 0);
  const totalAbonos = state.sales.reduce((acc, s) => acc + (s.total < 0 ? Math.abs(s.total) : 0), 0);
  const netEarnings = state.sales.reduce((acc, s) => acc + s.total, 0);

  // Journal metrics
  const projectedBalance = activeJournal 
    ? activeJournal.openingBalance + activeJournal.salesCash - activeJournal.expenses
    : 0;

  const handleOpenRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (openingBalance === '' || openingBalance < 0) {
      addToast('Monto de apertura inválido', 'warning');
      return;
    }

    store.openJournal(Number(openingBalance));
    addToast(`Caja Registradora Abierta con fondo de RD$ ${openingBalance}`, 'success');
    setOpeningBalance('');
  };

  const handleCloseRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJournal) return;

    const exp = expenses === '' ? 0 : Number(expenses);
    const act = actualBalance === '' ? 0 : Number(actualBalance);

    store.closeJournal(exp, projectedBalance, act);
    
    const diff = act - projectedBalance;
    if (diff === 0) {
      addToast('¡Cierre de caja exitoso y cuadrado perfectamente!', 'success');
    } else if (diff > 0) {
      addToast(`Caja cerrada con sobrante de RD$ ${diff}`, 'info');
    } else {
      addToast(`Caja cerrada con faltante de RD$ ${Math.abs(diff)} ⚠️`, 'danger');
    }

    setExpenses('');
    setActualBalance('');
  };

  // DGII 607 Export (Ventas con NCF)
  const export607CSV = () => {
    // Only sales with positive totals (sales, not abonos) and that have an NCF generated
    const fiscalSales = state.sales.filter(s => s.ncf && s.total > 0);

    if (fiscalSales.length === 0) {
      addToast('No hay transacciones con Comprobante Fiscal (NCF) registradas en este período', 'warning');
      return;
    }

    // Header in line with DGII format
    let csvContent = 'RNC_CEDULA,TIPO_IDENTIFICACION,NUMERO_COMPROBANTE_FISCAL,NUMERO_COMPROBANTE_MODIFICADO,TIPO_INGRESO,FECHA_COMPROBANTE,FECHA_RETENCION,MONTO_FACTURADO,ITBIS_FACTURADO,ITBIS_RETENIDO,ITBIS_PROPORCIONAL,ITBIS_LLEVADO_AL_COSTO,ITBIS_POR_ADELANTAR,ITBIS_PERCIBIDO,RETENCION_RENTA,ISR_PERCIBIDO,IMPUESTO_SELECTIVO,OTRO_IMPUESTO,MONTO_PROPINA_LEGAL,MONTO_EFECTIVO,MONTO_TARJETA,MONTO_CREDITO,MONTO_PERMUTAS,MONTO_OTRAS_FORMAS\n';

    fiscalSales.forEach(s => {
      const itbis = Math.round(s.total - (s.total / 1.18));
      const subtotal = s.total - itbis;
      
      const rnc = '131123456'; // Colma2 generic RNC
      const date = new Date(s.timestamp).toISOString().slice(0, 10).replace(/-/g, '');
      
      // Payment breakdown
      const cash = s.paymentMethod === 'Efectivo' ? s.total : 0;
      const card = s.paymentMethod === 'Tarjeta' ? s.total : 0;
      const fiao = s.paymentMethod === 'Fiao' ? s.total : 0;

      csvContent += `${rnc},1,${s.ncf},,01,${date},,${subtotal},${itbis},,,,,,0,,,,0,${cash},${card},${fiao},0,0\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `DGII_607_Colma2_${new Date().getFullYear()}_${new Date().getMonth() + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Reporte DGII 607 descargado con éxito', 'success');
  };

  // DGII 606 Export (Compras/Gastos)
  const export606CSV = () => {
    // Simulated purchases made in our store setup
    const simulatedPurchases = [
      { rnc: '101013401', supplier: 'Cervecería Nacional Dom.', ncf: 'B0100020102', total: 18500, cat: '02' },
      { rnc: '101024302', supplier: 'Consorcio Rica', ncf: 'B0100010403', total: 9500, cat: '02' },
      { rnc: '101035203', supplier: 'Induveca S.A.', ncf: 'B0100012025', total: 12400, cat: '02' }
    ];

    let csvContent = 'RNC_CEDULA,TIPO_IDENTIFICACION,TIPO_BIENES_SERVICIOS,NUMERO_COMPROBANTE_FISCAL,NUMERO_COMPROBANTE_MODIFICADO,FECHA_COMPROBANTE,FECHA_PAGO,MONTO_FACTURADO_SERVICIOS,MONTO_FACTURADO_BIENES,TOTAL_FACTURADO,ITBIS_FACTURADO,ITBIS_RETENIDO,ITBIS_PROPORCIONAL,ITBIS_COSTO,ITBIS_ADELANTAR,ITBIS_PERCIBIDO,TIPO_RETENCION,MONTO_RETENCION_RENTA,ISR_RETENIDO,MONTO_PROPINA,IMPUESTO_SELECTIVO,OTRO_IMPUESTO,MEDIO_PAGO\n';

    simulatedPurchases.forEach(p => {
      const itbis = Math.round(p.total - (p.total / 1.18));
      const subtotal = p.total - itbis;
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

      csvContent += `${p.rnc},1,${p.cat},${p.ncf},,${date},${date},0,${subtotal},${p.total},${itbis},,,,,,0,,,0,0,0,02\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `DGII_606_Colma2_${new Date().getFullYear()}_${new Date().getMonth() + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Reporte DGII 606 descargado con éxito', 'success');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px' }}>
      
      {/* Left panel: Register Square / Cuadre de Caja */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {!activeJournal ? (
          <div className="glass-card accent-danger" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <span style={{ fontSize: '48px' }}>🔒</span>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '20px', marginTop: '10px' }}>Caja Registradora Cerrada</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '6px', lineHeight: '1.4' }}>
                Para facturar productos en el Punto de Venta (POS), debes abrir la caja registradora ingresando el fondo de sencillo inicial.
              </p>
            </div>

            <form onSubmit={handleOpenRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label>Fondo de Caja Inicial (RD$):</label>
                <input
                  type="number"
                  required
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value ? Number(e.target.value) : '')}
                  className="form-control"
                  placeholder="Ej: 3000"
                  autoFocus
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '40px', fontSize: '13px' }}>
                🔓 Abrir Caja Registradora
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-card accent-success" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>Caja Abierta (Cuadre Activo)</h3>
              <span className="badge badge-success">Activa</span>
            </div>
            
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Iniciada: {new Date(activeJournal.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Fondo Inicial:</span>
                <span style={{ fontWeight: 'bold' }}>RD$ {activeJournal.openingBalance}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ventas en Efectivo:</span>
                <span style={{ fontWeight: 'bold', color: 'var(--color-success)' }}>+ RD$ {activeJournal.salesCash}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ventas Tarjeta:</span>
                <span>RD$ {activeJournal.salesCard}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ventas Transferencia:</span>
                <span>RD$ {activeJournal.salesTransfer}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ventas al Fiao:</span>
                <span style={{ color: 'var(--color-purple)' }}>RD$ {activeJournal.salesFiao}</span>
              </div>
              <div style={{ borderBottom: '1px dashed var(--glass-border)', margin: '4px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: 'var(--color-accent)' }}>
                <span>Efectivo Esperado:</span>
                <span>RD$ {projectedBalance}</span>
              </div>
            </div>

            {/* Close register form */}
            <form onSubmit={handleCloseRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Cerrar Turno y Cuadrar Caja</h4>
              <div className="form-group" style={{ marginBottom: '6px' }}>
                <label>Gastos Operativos Declarados (RD$):</label>
                <input
                  type="number"
                  value={expenses}
                  onChange={(e) => setExpenses(e.target.value ? Number(e.target.value) : '')}
                  className="form-control"
                  placeholder="Ej: 200 (hielo, botellón)"
                  style={{ height: '34px', fontSize: '13px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label>Efectivo Físico Contado en Caja (RD$):</label>
                <input
                  type="number"
                  required
                  value={actualBalance}
                  onChange={(e) => setActualBalance(e.target.value ? Number(e.target.value) : '')}
                  className="form-control"
                  placeholder="Contar monedas y billetes..."
                  style={{ height: '34px', fontSize: '13px' }}
                />
              </div>

              <button type="submit" className="btn btn-purple" style={{ width: '100%', height: '38px', fontSize: '13px' }}>
                🔒 Cerrar Turno y Cuadrar Caja
              </button>
            </form>
          </div>
        )}

        {/* History button */}
        <button
          onClick={() => setShowHistoryModal(true)}
          className="btn btn-secondary"
          style={{ width: '100%', fontSize: '12px' }}
        >
          📂 Ver Historial de Cuadros Cerrados
        </button>
      </div>

      {/* Right panel: Graphic dashboard & DGII exports */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Analytics stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div className="glass-card accent-primary" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Ventas Brutas Totales</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-accent)' }}>RD$ {totalSales}</div>
          </div>
          <div className="glass-card accent-success" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Ingresos por Abonos</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-success)' }}>RD$ {totalAbonos}</div>
          </div>
          <div className="glass-card accent-purple" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Balance de Caja Neto</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-purple)' }}>RD$ {netEarnings}</div>
          </div>
        </div>

        {/* Dynamic Vector charts mockup (SVG) */}
        <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Chart 1: Hourly Peak Sales line chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Horas Pico de Venta</h4>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--glass-border)', padding: '10px', height: '180px' }}>
              <svg width="100%" height="100%" viewBox="0 0 300 150">
                {/* Horizontal grid lines */}
                <line x1="20" y1="20" x2="280" y2="20" stroke="rgba(255,255,255,0.03)" />
                <line x1="20" y1="60" x2="280" y2="60" stroke="rgba(255,255,255,0.03)" />
                <line x1="20" y1="100" x2="280" y2="100" stroke="rgba(255,255,255,0.03)" />
                <line x1="20" y1="130" x2="280" y2="130" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />

                {/* Peak curve path */}
                <path
                  d="M 20 120 Q 60 110 80 40 T 140 100 T 200 30 T 280 110"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="3"
                  style={{ filter: 'drop-shadow(0 0 4px var(--color-accent))' }}
                />
                
                {/* Dot highlights */}
                <circle cx="80" cy="40" r="4" fill="#FFF" />
                <circle cx="200" cy="30" r="4" fill="#FFF" />

                {/* X labels */}
                <text x="20" y="145" fill="var(--text-secondary)" style={{ fontSize: '8px' }}>7:00 AM</text>
                <text x="80" y="145" fill="var(--text-secondary)" style={{ fontSize: '8px' }}>12:00 PM</text>
                <text x="140" y="145" fill="var(--text-secondary)" style={{ fontSize: '8px' }}>4:00 PM</text>
                <text x="200" y="145" fill="var(--text-secondary)" style={{ fontSize: '8px' }}>8:00 PM</text>
                <text x="270" y="145" fill="var(--text-secondary)" style={{ fontSize: '8px' }}>11 PM</text>
              </svg>
            </div>
          </div>

          {/* Chart 2: Top Selling Products bar chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Top Artículos Vendidos</h4>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--glass-border)', padding: '12px', height: '180px', display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                  <span>Presidente Grande</span>
                  <strong>18 unidades</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                  <div style={{ width: '85%', height: '100%', background: 'var(--color-purple)', borderRadius: '4px', boxShadow: 'var(--glow-purple)' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                  <span>Salami Induveca</span>
                  <strong>12 Lbs</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                  <div style={{ width: '60%', height: '100%', background: 'var(--color-purple)', borderRadius: '4px' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                  <span>Café Santo Domingo</span>
                  <strong>9 unidades</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                  <div style={{ width: '45%', height: '100%', background: 'var(--color-purple)', borderRadius: '4px' }}></div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Fiscal DGII Report Center */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--text-primary)' }}>Centro Fiscal DGII RD</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.4' }}>
            Compila y descarga los archivos de Comprobantes Fiscales Electrónicos. Estos archivos CSV corresponden exactamente a las especificaciones y normativas vigentes en la República Dominicana para la declaración de compras (606) y ventas (607).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '10px' }}>
            <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--glass-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Ventas</span>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '15px' }}>Formato DGII 607</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Reporte mensual de ventas de bienes y servicios emitidos con comprobantes NCF.
                </p>
              </div>
              <button
                onClick={export607CSV}
                className="btn btn-primary"
                style={{ width: '100%', padding: '8px', fontSize: '12px', marginTop: '12px' }}
              >
                📥 Exportar 607 (.csv)
              </button>
            </div>

            <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--glass-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
              <div>
                <span className="badge badge-purple" style={{ marginBottom: '6px' }}>Compras</span>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '15px' }}>Formato DGII 606</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Reporte de costos y gastos operativos incurridos con suplidores locales.
                </p>
              </div>
              <button
                onClick={export606CSV}
                className="btn btn-purple"
                style={{ width: '100%', padding: '8px', fontSize: '12px', marginTop: '12px' }}
              >
                📥 Exportar 606 (.csv)
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* History modal */}
      {showHistoryModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <button onClick={() => setShowHistoryModal(false)} className="modal-close">×</button>
            <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>Historial de Cuadros Cerrados</h3>
            
            <div className="table-container" style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '12px', border: '1px solid var(--glass-border)', maxHeight: '350px', overflowY: 'auto' }}>
              {state.journals.filter(j => j.closedAt).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)' }}>
                  No hay cuadros de caja cerrados todavía.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Fecha Cierre</th>
                      <th style={{ textAlign: 'right' }}>Fondo Inicial</th>
                      <th style={{ textAlign: 'right' }}>Esp. Efectivo</th>
                      <th style={{ textAlign: 'right' }}>Físico Contado</th>
                      <th style={{ textAlign: 'right' }}>Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.journals.filter(j => j.closedAt).map((j) => {
                      const expected = j.openingBalance + j.salesCash - j.expenses;
                      const diff = (j.closedBalance || 0) - expected;
                      return (
                        <tr key={j.id}>
                          <td>{new Date(j.closedAt!).toLocaleDateString()} {new Date(j.closedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td style={{ textAlign: 'right' }}>RD$ {j.openingBalance}</td>
                          <td style={{ textAlign: 'right' }}>RD$ {expected}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>RD$ {j.closedBalance}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: diff === 0 ? 'var(--color-success)' : diff > 0 ? 'var(--color-accent)' : 'var(--color-danger)' }}>
                            RD$ {diff > 0 ? `+${diff}` : diff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <button onClick={() => setShowHistoryModal(false)} className="btn btn-secondary" style={{ width: '100%', marginTop: '20px' }}>
              Cerrar Historial
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
export default Analytics;
