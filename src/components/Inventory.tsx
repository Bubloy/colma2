import React, { useState, useEffect } from 'react';
import { store } from '../db/store';
import type { AppState } from '../db/store';
import type { Product } from '../db/mockData';

interface InventoryProps {
  addToast: (message: string, type: 'success' | 'info' | 'danger' | 'warning') => void;
}

export const Inventory: React.FC<InventoryProps> = ({ addToast }) => {
  const [state, setState] = useState<AppState>(store.getState());
  const [activeTab, setActiveTab] = useState<'catalog' | 'suppliers'>('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  
  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState<'Bebidas' | 'Embutidos' | 'Víveres' | 'Despensa' | 'Limpieza' | 'Otros'>('Despensa');
  const [prodPrice, setProdPrice] = useState<number | ''>('');
  const [prodCost, setProdCost] = useState<number | ''>('');
  const [prodStock, setProdStock] = useState<number | ''>('');
  const [prodMinStock, setProdMinStock] = useState<number | ''>('');
  const [prodBarcode, setProdBarcode] = useState('');

  // Suppliers state
  const [selectedSupplier, setSelectedSupplier] = useState<string>('CND');
  const [restockQty, setRestockQty] = useState<number>(30);

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const filteredProducts = state.products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = state.products.filter(p => p.stock <= p.minStock);

  // Form actions
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCategory('Despensa');
    setProdPrice('');
    setProdCost('');
    setProdStock('');
    setProdMinStock('');
    setProdBarcode('746' + Math.floor(1000000000 + Math.random() * 9000000000).toString());
    setShowProductModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdCategory(p.category);
    setProdPrice(p.price);
    setProdCost(p.cost);
    setProdStock(p.stock);
    setProdMinStock(p.minStock);
    setProdBarcode(p.barcode);
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || prodPrice === '' || prodCost === '' || prodStock === '' || prodMinStock === '') {
      addToast('Por favor completa todos los campos requeridos', 'warning');
      return;
    }

    const newProd: Product = {
      id: editingProduct ? editingProduct.id : 'p_' + Math.random().toString(36).substr(2, 9),
      name: prodName,
      category: prodCategory,
      price: Number(prodPrice),
      cost: Number(prodCost),
      stock: Number(prodStock),
      minStock: Number(prodMinStock),
      barcode: prodBarcode
    };

    store.saveProduct(newProd);
    addToast(editingProduct ? `Producto "${prodName}" actualizado` : `Producto "${prodName}" guardado`, 'success');
    setShowProductModal(false);
  };

  // Suplidores info
  const suppliers = [
    { id: 'CND', name: 'Cervecería Nacional Dominicana', desc: 'Presidente, Bohemia, Malta Morena', category: 'Bebidas' },
    { id: 'Brugal', name: 'Brugal & Co.', desc: 'Brugal Extra Viejo, Barceló Añejo', category: 'Bebidas' },
    { id: 'Rica', name: 'Consorcio Rica', desc: 'Leche Listamilk, Jugos Rica', category: 'Despensa' },
    { id: 'Induveca', name: 'Induveca S.A.', desc: 'Salami Súper Especial, Jamón Caserío, Queso Sosúa', category: 'Embutidos' },
    { id: 'Merca', name: 'Mercado Mayorista (Merca Santo Domingo)', desc: 'Plátanos, Yuca, Víveres frescos, Cebolla', category: 'Víveres' }
  ];

  const handleSupplierRestock = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find products matching the supplier category
    const supplier = suppliers.find(s => s.id === selectedSupplier);
    if (!supplier) return;

    const productsToRestock = state.products.filter(p => p.category === supplier.category);
    
    if (productsToRestock.length === 0) {
      addToast('No hay productos registrados para la categoría de este suplidor', 'warning');
      return;
    }

    // Perform simulated restock in DB
    productsToRestock.forEach(p => {
      // increase stock
      store.restockProduct(p.id, restockQty, p.cost);
    });

    addToast(`Restablecido el stock de ${productsToRestock.length} artículos de ${supplier.name} (+${restockQty} c/u)`, 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`btn ${activeTab === 'catalog' ? 'btn-cyan' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          📋 Catálogo de Productos
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`btn ${activeTab === 'suppliers' ? 'btn-cyan' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          🚚 Órdenes de Suplidores
        </button>
      </div>

      {activeTab === 'catalog' ? (
        <>
          {/* Alertas de Stock Bajo */}
          {lowStockItems.length > 0 && (
            <div className="offline-banner" style={{ background: 'rgba(255, 171, 0, 0.1)', color: 'var(--color-warning)', border: '1px solid rgba(255, 171, 0, 0.3)' }}>
              ⚠️ <strong>¡Alerta de Inventario!</strong> Tienes {lowStockItems.length} producto{lowStockItems.length > 1 ? 's' : ''} por debajo del stock mínimo.
              <button
                onClick={() => {
                  setActiveTab('suppliers');
                  addToast('Dirigiéndote al portal de suplidores para reabastecer', 'info');
                }}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11px', marginLeft: '12px', height: '24px', color: '#FFAB00', borderColor: '#FFAB00' }}
              >
                Reabastecer Ahora
              </button>
            </div>
          )}

          {/* Catalog view container */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Catálogo de Almacén</h2>
              <button onClick={handleOpenAdd} className="btn btn-cyan" style={{ padding: '8px 16px', fontSize: '13px' }}>
                + Agregar Nuevo Producto
              </button>
            </div>

            {/* Filter controls */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Buscar por descripción o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control"
                style={{ flex: 1, minWidth: '200px' }}
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-control"
                style={{ width: '180px' }}
              >
                <option value="Todos">Todas las Categorías</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Embutidos">Embutidos / Quesos</option>
                <option value="Víveres">Víveres / Vegetales</option>
                <option value="Despensa">Despensa (Essentials)</option>
                <option value="Limpieza">Limpieza</option>
              </select>
            </div>

            {/* Catalog Table */}
            <div className="table-container" style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <table>
                <thead>
                  <tr>
                    <th>Código de Barra</th>
                    <th>Nombre / Descripción</th>
                    <th>Categoría</th>
                    <th style={{ textAlign: 'center' }}>Stock</th>
                    <th style={{ textAlign: 'right' }}>Costo (RD$)</th>
                    <th style={{ textAlign: 'right' }}>Venta (RD$)</th>
                    <th style={{ textAlign: 'center' }}>Margen</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const margin = Math.round(((p.price - p.cost) / p.price) * 100);
                    const isLow = p.stock <= p.minStock;
                    return (
                      <tr key={p.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>{p.barcode}</td>
                        <td style={{ fontWeight: 'bold', color: '#FFF' }}>{p.name}</td>
                        <td>{p.category}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`} style={{ minWidth: '45px', textAlign: 'center' }}>
                            {p.stock} {isLow ? '⚠️' : ''}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>RD$ {p.cost}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-accent)' }}>RD$ {p.price}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 'bold', color: margin >= 30 ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                            {margin}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', height: '24px' }}
                          >
                            ✏️ Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Suppliers Restock view container */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' }}>
          
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2>Listado de Suplidores Dominicanos</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {suppliers.map(s => {
                const count = state.products.filter(p => p.category === s.category).length;
                const lowCount = state.products.filter(p => p.category === s.category && p.stock <= p.minStock).length;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSupplier(s.id)}
                    className="glass-card"
                    style={{
                      cursor: 'pointer',
                      border: selectedSupplier === s.id ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)',
                      background: selectedSupplier === s.id ? 'rgba(0, 240, 255, 0.05)' : 'var(--bg-secondary)',
                      padding: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold', color: '#FFF', fontSize: '16px' }}>{s.name}</span>
                      <span className="badge badge-purple">{s.id}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Distribuye: {s.desc}</p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', fontSize: '11px' }}>
                      <span>Productos: <strong>{count}</strong></span>
                      {lowCount > 0 && (
                        <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>⚠️ {lowCount} con stock bajo!</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card accent-cyan" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3>Generar Orden de Compra</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '8px 0 20px 0', lineHeight: '1.4' }}>
                Selecciona un suplidor en el listado para colocar una orden simulada. Al confirmar, el stock del almacén se incrementará automáticamente.
              </p>

              <form onSubmit={handleSupplierRestock} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Suplidor Seleccionado:</label>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--color-accent)', padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                    {suppliers.find(s => s.id === selectedSupplier)?.name}
                  </div>
                </div>

                <div className="form-group">
                  <label>Monto de Reabastecimiento por Artículo:</label>
                  <select
                    value={restockQty}
                    onChange={(e) => setRestockQty(Number(e.target.value))}
                    className="form-control"
                  >
                    <option value="12">1 Caja (12 unidades)</option>
                    <option value="24">2 Cajas (24 unidades)</option>
                    <option value="48">4 Cajas (48 unidades)</option>
                    <option value="100">Lote Mayorista (100 unidades)</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-cyan" style={{ width: '100%', height: '42px', fontSize: '14px', marginTop: '10px' }}>
                  ⚡ Confirmar Compra y Reabastecer
                </button>
              </form>
            </div>

            <div style={{ background: 'rgba(0,240,255,0.03)', border: '1px dashed rgba(0,240,255,0.2)', padding: '12px', borderRadius: '12px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', marginTop: '20px' }}>
              💡 Al presionar el botón se simulará la factura de compra de fábrica, actualizando el stock y los costos del inventario en tiempo real.
            </div>
          </div>

        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={() => setShowProductModal(false)} className="modal-close">×</button>
            <h3 style={{ marginBottom: '20px', color: '#FFF' }}>
              {editingProduct ? 'Editar Producto de Almacén' : 'Agregar Nuevo Producto'}
            </h3>
            
            <form onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label>Descripción / Nombre:</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="form-control"
                  placeholder="Ej: Presidente Grande 650ml"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Categoría:</label>
                  <select
                    value={prodCategory}
                    onChange={(e: any) => setProdCategory(e.target.value)}
                    className="form-control"
                  >
                    <option value="Bebidas">Bebidas</option>
                    <option value="Embutidos">Embutidos</option>
                    <option value="Víveres">Víveres</option>
                    <option value="Despensa">Despensa</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Código de Barra:</label>
                  <input
                    type="text"
                    required
                    value={prodBarcode}
                    onChange={(e) => setProdBarcode(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Costo Unitario (RD$):</label>
                  <input
                    type="number"
                    required
                    value={prodCost}
                    onChange={(e) => setProdCost(e.target.value ? Number(e.target.value) : '')}
                    className="form-control"
                    placeholder="Ej: 150"
                  />
                </div>
                <div className="form-group">
                  <label>Precio Venta (RD$):</label>
                  <input
                    type="number"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value ? Number(e.target.value) : '')}
                    className="form-control"
                    placeholder="Ej: 200"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Existencia Inicial:</label>
                  <input
                    type="number"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value ? Number(e.target.value) : '')}
                    className="form-control"
                    placeholder="Ej: 50"
                  />
                </div>
                <div className="form-group">
                  <label>Stock Mínimo (Alerta):</label>
                  <input
                    type="number"
                    required
                    value={prodMinStock}
                    onChange={(e) => setProdMinStock(e.target.value ? Number(e.target.value) : '')}
                    className="form-control"
                    placeholder="Ej: 10"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-cyan" style={{ flex: 1 }}>
                  {editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
                </button>
                <button type="button" onClick={() => setShowProductModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Inventory;
