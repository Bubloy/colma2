import React, { useState, useEffect } from 'react';
import { store } from '../db/store';
import type { AppState } from '../db/store';
import type { Product } from '../db/mockData';

interface POSProps {
  addToast: (message: string, type: 'success' | 'info' | 'danger' | 'warning') => void;
}

export const POS: React.FC<POSProps> = ({ addToast }) => {
  const [state, setState] = useState<AppState>(store.getState());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [taxType, setTaxType] = useState<'Consumo' | 'Crédito Fiscal' | 'Único'>('Consumo');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Fiao'>('Efectivo');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  // Ticket Modal state
  const [showTicket, setShowTicket] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  // Filter products
  const filteredProducts = state.products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['Todos', 'Bebidas', 'Embutidos', 'Víveres', 'Despensa', 'Limpieza'];

  // Add to cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      addToast(`¡Sin existencias de ${product.name}!`, 'danger');
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      
      if (currentQty >= product.stock) {
        addToast(`No puedes vender más del stock actual (${product.stock} unidades)`, 'warning');
        return prevCart;
      }

      if (existing) {
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevCart, { product, quantity: 1 }];
      }
    });
  };

  // Remove / decrement from cart
  const decrementCart = (productId: string) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prevCart.map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      } else {
        return prevCart.filter((item) => item.product.id !== productId);
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  // Calculate totals
  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const total = subtotal; // price includes itbis in typical colmado or we represent total as subtotal + itbis.
  // Let's design: price is final price (includes ITBIS), subtotal is total / 1.18, ITBIS is total - subtotal.
  const taxAmount = Math.round(total - (total / 1.18));
  const subtotalBeforeTax = total - taxAmount;

  // Change calculation
  const changeGiven = typeof cashReceived === 'number' ? Math.max(0, cashReceived - total) : 0;

  // Selected client for fiao
  const selectedClient = state.clients.find((c) => c.id === selectedClientId);
  const isOverCreditLimit = selectedClient ? (selectedClient.balance + total > selectedClient.creditLimit) : false;

  // Simulated Barcode Scanner trigger
  const handleBarcodeScanSimulate = (barcode: string) => {
    const product = state.products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
      addToast(`Escaneado: ${product.name}`, 'info');
    } else {
      addToast(`Código de barra [${barcode}] no registrado`, 'danger');
    }
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      addToast('El carrito está vacío', 'warning');
      return;
    }

    if (!state.currentJournalId) {
      addToast('Debes abrir la caja registradora primero (ve al panel de Finanzas)', 'danger');
      return;
    }

    if (paymentMethod === 'Fiao') {
      if (!selectedClientId) {
        addToast('Selecciona un cliente para el Fiao', 'warning');
        return;
      }
      if (isOverCreditLimit) {
        addToast(`⚠️ Límite de crédito superado para ${selectedClient?.nickname}. Límite: RD$${selectedClient?.creditLimit}`, 'danger');
        // Let's allow it in Dominican colmado, but alert heavily! Actually, we block or allow? Let's allow but flag.
      }
    }

    if (paymentMethod === 'Efectivo') {
      if (cashReceived === '' || cashReceived < total) {
        addToast('Efectivo recibido insuficiente', 'warning');
        return;
      }
    }

    // Prepare sale items
    const saleItems = cart.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity
    }));

    try {
      const completedSale = store.addSale({
        items: saleItems,
        total,
        paymentMethod,
        clientId: paymentMethod === 'Fiao' ? selectedClientId : undefined,
        taxType,
        cashReceived: paymentMethod === 'Efectivo' ? Number(cashReceived) : undefined,
        changeGiven: paymentMethod === 'Efectivo' ? changeGiven : undefined
      });

      // Show receipt
      setLastSale(completedSale);
      setShowTicket(true);
      
      // Auto Toast
      addToast(`Venta completada (RD$${total}) via ${paymentMethod}`, 'success');

      // Clear POS state
      setCart([]);
      setCashReceived('');
      setSelectedClientId('');
    } catch (err) {
      addToast('Error al procesar la venta', 'danger');
    }
  };

  return (
    <div className="pos-layout">
      {/* Products catalog panel */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--color-accent)' }}>
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Facturación y POS
          </h2>
          
          {/* Simulated Scanner select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Escáner Rápido:</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBarcodeScanSimulate(e.target.value);
                  e.target.value = '';
                }
              }}
              className="form-control"
              style={{ padding: '6px 12px', fontSize: '12px', width: '180px', height: '32px' }}
            >
              <option value="">-- Escanear Artículo --</option>
              {state.products.map(p => (
                <option key={p.id} value={p.barcode}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search and Category filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar por nombre o escáner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
            style={{ flex: 1, minWidth: '200px' }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px' }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="pos-products-grid">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => addToCart(product)}
              className="product-item-card"
            >
              <div>
                <div className="product-item-name">{product.name}</div>
                <div className="product-item-cat">{product.category}</div>
              </div>
              <div>
                <div className="product-item-price">RD$ {product.price}</div>
                <div className={`product-item-stock ${product.stock <= product.minStock ? 'low' : ''}`}>
                  Stock: {product.stock} {product.stock <= product.minStock ? '⚠️ ¡Bajo!' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart and checkout panel */}
      <div className="glass-card accent-primary" style={{ borderTopRightRadius: '16px', borderBottomRightRadius: '16px' }}>
        <div className="cart-container">
          <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Carrito de Compras</span>
              <span className="badge badge-primary">{cart.reduce((a, b) => a + b.quantity, 0)} Items</span>
            </h3>
          </div>

          {/* Cart items */}
          <div className="cart-items">
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '10px' }}>
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <p>Carrito Vacío</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>Haz clic en un producto para agregarlo.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="cart-item">
                  <div className="cart-item-details">
                    <div className="cart-item-name">{item.product.name}</div>
                    <div className="cart-item-price">RD$ {item.product.price} x {item.quantity}</div>
                  </div>
                  <div className="cart-item-qty-actions">
                    <button onClick={() => decrementCart(item.product.id)} className="qty-btn">-</button>
                    <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</span>
                    <button onClick={() => addToCart(item.product)} className="qty-btn">+</button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', marginLeft: '6px' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout controls */}
          <form onSubmit={handleCheckout} className="cart-totals">
            <div className="cart-total-row">
              <span style={{ color: 'var(--text-secondary)' }}>Comprobante Fiscal DGII:</span>
              <select
                value={taxType}
                onChange={(e: any) => setTaxType(e.target.value)}
                className="form-control"
                style={{ width: '160px', padding: '4px 10px', height: '30px', fontSize: '12px' }}
              >
                <option value="Consumo">B02 Consumo</option>
                <option value="Crédito Fiscal">B01 Crédito Fiscal</option>
                <option value="Único">B14 Único</option>
              </select>
            </div>

            <div className="cart-total-row">
              <span style={{ color: 'var(--text-secondary)' }}>Método de Pago:</span>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="form-control"
                style={{ width: '160px', padding: '4px 10px', height: '30px', fontSize: '12px' }}
              >
                <option value="Efectivo">💵 Efectivo</option>
                <option value="Tarjeta">💳 Tarjeta / mPOS</option>
                <option value="Transferencia">🏦 Transferencia</option>
                <option value="Fiao">✍️ El Fiao</option>
              </select>
            </div>

            {/* Conditionally render details based on payment method */}
            {paymentMethod === 'Efectivo' && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', marginBottom: '10px', border: '1px solid var(--glass-border)' }}>
                <div className="form-group" style={{ marginBottom: '6px' }}>
                  <label>Efectivo Recibido (RD$):</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value ? Number(e.target.value) : '')}
                    className="form-control"
                    placeholder="Ej: 500"
                    style={{ height: '36px', padding: '6px 12px' }}
                  />
                </div>
                {typeof cashReceived === 'number' && cashReceived >= total && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: 'var(--color-success)' }}>
                    <span>Cambio Devuelto:</span>
                    <span>RD$ {changeGiven}</span>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'Fiao' && (
              <div style={{ background: 'rgba(157, 78, 221, 0.05)', padding: '10px', borderRadius: '8px', marginBottom: '10px', border: '1px solid rgba(157,78,221,0.2)' }}>
                <div className="form-group" style={{ marginBottom: '6px' }}>
                  <label>Seleccionar Cliente Deudor:</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="form-control"
                    style={{ height: '36px', padding: '6px 12px', fontSize: '13px' }}
                  >
                    <option value="">-- Elegir Cliente --</option>
                    {state.clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nickname || c.name} (Saldo: RD$ {c.balance})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedClient && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Límite de Crédito:</span>
                      <span style={{ fontWeight: 'bold' }}>RD$ {selectedClient.creditLimit}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Nuevo Saldo Proyectado:</span>
                      <span style={{ fontWeight: 'bold', color: isOverCreditLimit ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        RD$ {selectedClient.balance + total}
                      </span>
                    </div>
                    {isOverCreditLimit && (
                      <div style={{ color: 'var(--color-danger)', fontWeight: 'bold', marginTop: '2px' }}>
                        ⚠️ Límite excedido por RD$ {selectedClient.balance + total - selectedClient.creditLimit}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="cart-total-row" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              <span>Subtotal neto:</span>
              <span>RD$ {subtotalBeforeTax}</span>
            </div>
            <div className="cart-total-row" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>ITBIS Estimado (18% incluido):</span>
              <span>RD$ {taxAmount}</span>
            </div>

            <div className="cart-total-row grand-total">
              <span>Total:</span>
              <span>RD$ {total}</span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '14px', height: '48px', fontSize: '16px' }}
              disabled={!state.currentJournalId || cart.length === 0}
            >
              {!state.currentJournalId
                ? '🔒 CAJA CERRADA'
                : `COBRAR RD$ ${total}`}
            </button>
          </form>
        </div>
      </div>

      {/* Ticket Modal Simulator */}
      {showTicket && lastSale && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '360px', padding: '20px' }}>
            <button onClick={() => setShowTicket(false)} className="modal-close">×</button>
            
            <div className="ticket-container" style={{ boxShadow: 'none', border: '1px solid #CCC' }}>
              <div className="ticket-header">
                <h3 style={{ fontStyle: 'italic', fontWeight: 900, fontSize: '20px', color: '#000' }}>COLMA2</h3>
                <p style={{ fontSize: '10px' }}>colma2.com</p>
                <p style={{ fontSize: '9px' }}>El Colmado Inteligente S.R.L.</p>
                <p style={{ fontSize: '9px' }}>Av. Winston Churchill, Santo Domingo, RD</p>
                <p style={{ fontSize: '9px' }}>RNC: 1-31-12345-6</p>
                <p style={{ fontSize: '9px' }}>Tel: 809-555-0101</p>
              </div>

              <div className="ticket-divider"></div>
              
              <div style={{ fontSize: '9px', marginBottom: '4px' }}>
                <div>FECHA: {new Date(lastSale.timestamp).toLocaleString()}</div>
                <div>ID VENTA: {lastSale.id}</div>
                {lastSale.ncf && (
                  <div style={{ fontWeight: 'bold' }}>NCF: {lastSale.ncf}</div>
                )}
                {lastSale.taxType && (
                  <div>TIPO DOC: Comprobante {lastSale.taxType}</div>
                )}
              </div>

              <div className="ticket-divider"></div>

              {/* Items Table */}
              <div style={{ fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '4px' }}>
                  <span style={{ flex: 2 }}>Art.</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>Cant</span>
                  <span style={{ flex: 1, textAlign: 'right' }}>Total</span>
                </div>
                {lastSale.items.map((item: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span style={{ flex: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>{item.quantity}</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="ticket-divider"></div>

              <div style={{ fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal Neto:</span>
                  <span>RD$ {Math.round(lastSale.total - (lastSale.total - (lastSale.total / 1.18)))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>ITBIS (18%):</span>
                  <span>RD$ {Math.round(lastSale.total - (lastSale.total / 1.18))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', marginTop: '2px' }}>
                  <span>TOTAL RD$:</span>
                  <span>RD$ {lastSale.total}</span>
                </div>
              </div>

              <div className="ticket-divider"></div>

              <div style={{ fontSize: '9px', textAlign: 'center' }}>
                <div>MÉTODO: {lastSale.paymentMethod}</div>
                {lastSale.paymentMethod === 'Efectivo' && (
                  <>
                    <div>EFECTIVO: RD$ {lastSale.cashReceived}</div>
                    <div>DEVUELTA: RD$ {lastSale.changeGiven}</div>
                  </>
                )}
                {lastSale.paymentMethod === 'Fiao' && (
                  <div style={{ fontWeight: 'bold' }}>DEUDOR: {lastSale.clientName}</div>
                )}
              </div>

              {/* QR Code generator placeholder via SVG */}
              <div className="ticket-qr">
                <svg width="80" height="80" viewBox="0 0 100 100">
                  {/* Outer border */}
                  <rect x="5" y="5" width="90" height="90" fill="none" stroke="#000" strokeWidth="3" />
                  {/* Position detection patterns */}
                  <rect x="15" y="15" width="20" height="20" fill="#000" />
                  <rect x="20" y="20" width="10" height="10" fill="#FFF" />
                  
                  <rect x="65" y="15" width="20" height="20" fill="#000" />
                  <rect x="70" y="20" width="10" height="10" fill="#FFF" />
                  
                  <rect x="15" y="65" width="20" height="20" fill="#000" />
                  <rect x="20" y="70" width="10" height="10" fill="#FFF" />
                  
                  {/* Simulated random QR pixel blocks */}
                  <rect x="45" y="25" width="8" height="8" fill="#000" />
                  <rect x="40" y="45" width="16" height="8" fill="#000" />
                  <rect x="65" y="45" width="8" height="16" fill="#000" />
                  <rect x="45" y="65" width="12" height="12" fill="#000" />
                  <rect x="65" y="75" width="16" height="8" fill="#000" />
                  <rect x="25" y="45" width="8" height="8" fill="#000" />
                  <rect x="75" y="65" width="8" height="8" fill="#000" />
                </svg>
              </div>

              <div style={{ fontSize: '8px', textAlign: 'center', marginTop: '10px', color: '#666' }}>
                e-CF certificado por la DGII
                <br />
                ¡Gracias por preferir Colma2!
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  addToast('Ticket enviado a la impresora térmica (simulado)', 'success');
                  setShowTicket(false);
                }}
                className="btn btn-purple"
                style={{ flex: 1 }}
              >
                🖨️ Imprimir
              </button>
              <button
                onClick={() => setShowTicket(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default POS;
