import { INITIAL_PRODUCTS, INITIAL_CLIENTS } from './mockData';
import type { Product, Client, Sale, Delivery, CashJournal } from './mockData';

export interface AppState {
  products: Product[];
  clients: Client[];
  sales: Sale[];
  deliveries: Delivery[];
  journals: CashJournal[];
  isOnline: boolean;
  offlineQueue: Sale[];
  activeRole: 'Super Admin' | 'Cajero' | 'Delivery';
  currentJournalId: string | null;
}

type Listener = (state: AppState) => void;

class StateStore {
  private state: AppState;
  private listeners = new Set<Listener>();

  constructor() {
    this.state = this.loadInitialState();
    
    // Listen for storage events in other tabs
    window.addEventListener('storage', () => {
      this.state = this.loadInitialState();
      this.notify();
    });
  }

  private loadInitialState(): AppState {
    const productsJson = localStorage.getItem('colma2_products');
    const clientsJson = localStorage.getItem('colma2_clients');
    const salesJson = localStorage.getItem('colma2_sales');
    const deliveriesJson = localStorage.getItem('colma2_deliveries');
    const journalsJson = localStorage.getItem('colma2_journals');
    const roleJson = localStorage.getItem('colma2_active_role');
    const onlineJson = localStorage.getItem('colma2_is_online');
    const queueJson = localStorage.getItem('colma2_offline_queue');
    const currentJournalId = localStorage.getItem('colma2_current_journal_id');

    const products = productsJson ? JSON.parse(productsJson) : INITIAL_PRODUCTS;
    const clients = clientsJson ? JSON.parse(clientsJson) : INITIAL_CLIENTS;
    const sales = salesJson ? JSON.parse(salesJson) : [];
    const deliveries = deliveriesJson ? JSON.parse(deliveriesJson) : [];
    const journals = journalsJson ? JSON.parse(journalsJson) : [];
    const activeRole = (roleJson ? JSON.parse(roleJson) : 'Super Admin') as AppState['activeRole'];
    const isOnline = onlineJson ? JSON.parse(onlineJson) === true : true;
    const offlineQueue = queueJson ? JSON.parse(queueJson) : [];

    // Ensure we save initial setup if empty
    if (!productsJson) localStorage.setItem('colma2_products', JSON.stringify(products));
    if (!clientsJson) localStorage.setItem('colma2_clients', JSON.stringify(clients));
    if (!salesJson) localStorage.setItem('colma2_sales', JSON.stringify(sales));
    if (!deliveriesJson) localStorage.setItem('colma2_deliveries', JSON.stringify(deliveries));
    if (!journalsJson) localStorage.setItem('colma2_journals', JSON.stringify(journals));
    if (!roleJson) localStorage.setItem('colma2_active_role', JSON.stringify(activeRole));
    if (!onlineJson) localStorage.setItem('colma2_is_online', JSON.stringify(isOnline));
    if (!queueJson) localStorage.setItem('colma2_offline_queue', JSON.stringify(offlineQueue));

    return {
      products,
      clients,
      sales,
      deliveries,
      journals,
      isOnline,
      offlineQueue,
      activeRole,
      currentJournalId
    };
  }

  private saveState() {
    localStorage.setItem('colma2_products', JSON.stringify(this.state.products));
    localStorage.setItem('colma2_clients', JSON.stringify(this.state.clients));
    localStorage.setItem('colma2_sales', JSON.stringify(this.state.sales));
    localStorage.setItem('colma2_deliveries', JSON.stringify(this.state.deliveries));
    localStorage.setItem('colma2_journals', JSON.stringify(this.state.journals));
    localStorage.setItem('colma2_active_role', JSON.stringify(this.state.activeRole));
    localStorage.setItem('colma2_is_online', JSON.stringify(this.state.isOnline));
    localStorage.setItem('colma2_offline_queue', JSON.stringify(this.state.offlineQueue));
    if (this.state.currentJournalId) {
      localStorage.setItem('colma2_current_journal_id', this.state.currentJournalId);
    } else {
      localStorage.removeItem('colma2_current_journal_id');
    }
  }

  public getState(): AppState {
    return { ...this.state };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Initial emission
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach(listener => listener(currentState));
  }

  // State mutation operations
  public setRole(role: AppState['activeRole']) {
    this.state.activeRole = role;
    this.saveState();
    this.notify();
  }

  public setOnline(isOnline: boolean) {
    const wasOffline = !this.state.isOnline;
    this.state.isOnline = isOnline;
    
    if (isOnline && wasOffline && this.state.offlineQueue.length > 0) {
      // Trigger sync
      this.syncOfflineSales();
    } else {
      this.saveState();
      this.notify();
    }
  }

  private syncOfflineSales() {
    // Simulating syncing process
    const syncedSales = this.state.offlineQueue.map(sale => ({
      ...sale,
      isSynced: true
    }));

    this.state.sales = [...this.state.sales, ...syncedSales];
    this.state.offlineQueue = [];
    this.saveState();
    this.notify();
  }

  // POS operations
  public addSale(saleData: Omit<Sale, 'id' | 'isSynced' | 'timestamp'>) {
    const timestamp = new Date().toISOString();
    const id = 's_' + Math.random().toString(36).substr(2, 9);
    
    // NCF Generator simulation
    let ncf: string | undefined = undefined;
    if (saleData.taxType === 'Crédito Fiscal') {
      // DGII B01 series
      ncf = 'B01' + Math.floor(10000000 + Math.random() * 90000000).toString();
    } else if (saleData.taxType === 'Consumo') {
      // DGII B02 series
      ncf = 'B02' + Math.floor(10000000 + Math.random() * 90000000).toString();
    } else if (saleData.taxType === 'Único') {
      ncf = 'B14' + Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    const newSale: Sale = {
      ...saleData,
      id,
      timestamp,
      ncf,
      isSynced: this.state.isOnline
    };

    // 1. Deduct Product Stocks
    this.state.products = this.state.products.map(p => {
      const saleItem = newSale.items.find(item => item.productId === p.id);
      if (saleItem) {
        return { ...p, stock: Math.max(0, p.stock - saleItem.quantity) };
      }
      return p;
    });

    // 2. Manage Fiao if balance needed
    if (newSale.paymentMethod === 'Fiao' && newSale.clientId) {
      this.state.clients = this.state.clients.map(c => {
        if (c.id === newSale.clientId) {
          return { ...c, balance: c.balance + newSale.total };
        }
        return c;
      });
      // Retrieve client name
      const client = this.state.clients.find(c => c.id === newSale.clientId);
      if (client) {
        newSale.clientName = client.nickname || client.name;
      }
    }

    // 3. Add to sales list or offline queue
    if (this.state.isOnline) {
      this.state.sales.unshift(newSale);
    } else {
      this.state.offlineQueue.unshift(newSale);
    }

    // 4. Update Current Cash Journal
    if (this.state.currentJournalId) {
      this.state.journals = this.state.journals.map(j => {
        if (j.id === this.state.currentJournalId) {
          return {
            ...j,
            salesCash: j.salesCash + (newSale.paymentMethod === 'Efectivo' ? newSale.total : 0),
            salesCard: j.salesCard + (newSale.paymentMethod === 'Tarjeta' ? newSale.total : 0),
            salesTransfer: j.salesTransfer + (newSale.paymentMethod === 'Transferencia' ? newSale.total : 0),
            salesFiao: j.salesFiao + (newSale.paymentMethod === 'Fiao' ? newSale.total : 0)
          };
        }
        return j;
      });
    }

    this.saveState();
    this.notify();
    return newSale;
  }

  // Client operations
  public registerClient(client: Omit<Client, 'id' | 'balance'>) {
    const id = 'c_' + Math.random().toString(36).substr(2, 9);
    const newClient: Client = {
      ...client,
      id,
      balance: 0
    };
    this.state.clients.push(newClient);
    this.saveState();
    this.notify();
    return newClient;
  }

  public editClient(client: Client) {
    this.state.clients = this.state.clients.map(c => c.id === client.id ? client : c);
    this.saveState();
    this.notify();
  }

  public recordAbono(clientId: string, amount: number) {
    this.state.clients = this.state.clients.map(c => {
      if (c.id === clientId) {
        return { ...c, balance: Math.max(0, c.balance - amount) };
      }
      return c;
    });

    // We represent an abono as a negative-total fiao sale or we can log it in sales as a transaction.
    // Let's create an abono record in sales for reporting
    const client = this.state.clients.find(c => c.id === clientId);
    const id = 'ab_' + Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();
    const abonoSale: Sale = {
      id,
      timestamp,
      items: [{
        productId: 'abono',
        name: 'Abono a Cuenta',
        price: -amount,
        quantity: 1
      }],
      total: -amount,
      paymentMethod: 'Efectivo', // Payment method used for abono
      clientId,
      clientName: client ? (client.nickname || client.name) : 'Cliente',
      taxType: 'Único',
      isSynced: this.state.isOnline
    };

    this.state.sales.unshift(abonoSale);

    // Update current Cash Journal
    if (this.state.currentJournalId) {
      this.state.journals = this.state.journals.map(j => {
        if (j.id === this.state.currentJournalId) {
          // Abono brings cash into register
          return {
            ...j,
            salesCash: j.salesCash + amount
          };
        }
        return j;
      });
    }

    this.saveState();
    this.notify();
  }

  // Inventory operations
  public saveProduct(product: Product) {
    const exists = this.state.products.some(p => p.id === product.id);
    if (exists) {
      this.state.products = this.state.products.map(p => p.id === product.id ? product : p);
    } else {
      this.state.products.push(product);
    }
    this.saveState();
    this.notify();
  }

  public restockProduct(productId: string, quantity: number, cost: number) {
    this.state.products = this.state.products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          stock: p.stock + quantity,
          cost: cost // update cost price
        };
      }
      return p;
    });
    this.saveState();
    this.notify();
  }

  // Cash Journal operations
  public openJournal(openingBalance: number) {
    const id = 'j_' + Math.random().toString(36).substr(2, 9);
    const newJournal: CashJournal = {
      id,
      openedAt: new Date().toISOString(),
      openingBalance,
      salesCash: 0,
      salesCard: 0,
      salesTransfer: 0,
      salesFiao: 0,
      expenses: 0
    };
    this.state.journals.unshift(newJournal);
    this.state.currentJournalId = id;
    this.saveState();
    this.notify();
    return newJournal;
  }

  public closeJournal(expenses: number, expectedBalance: number, actualBalance: number) {
    if (!this.state.currentJournalId) return;

    this.state.journals = this.state.journals.map(j => {
      if (j.id === this.state.currentJournalId) {
        return {
          ...j,
          closedAt: new Date().toISOString(),
          expenses,
          expectedBalance,
          closedBalance: actualBalance
        };
      }
      return j;
    });

    this.state.currentJournalId = null;
    this.saveState();
    this.notify();
  }

  // Logistics / Delivery operations
  public assignDelivery(saleId: string, address: string, phone: string, riderName: string, coordinates: { x: number; y: number }) {
    const id = 'd_' + Math.random().toString(36).substr(2, 9);
    const sale = this.state.sales.find(s => s.id === saleId) || this.state.offlineQueue.find(s => s.id === saleId);
    
    const newDelivery: Delivery = {
      id,
      saleId,
      clientName: sale ? (sale.clientName || 'Cliente Genérico') : 'Cliente Genérico',
      address,
      phone,
      status: 'Recibido',
      riderName,
      assignedTime: new Date().toISOString(),
      coordinates
    };

    this.state.deliveries.unshift(newDelivery);

    // Link delivery ID back to sale
    this.state.sales = this.state.sales.map(s => s.id === saleId ? { ...s, deliveryId: id } : s);
    this.state.offlineQueue = this.state.offlineQueue.map(s => s.id === saleId ? { ...s, deliveryId: id } : s);

    this.saveState();
    this.notify();
    return newDelivery;
  }

  public updateDeliveryStatus(deliveryId: string, status: Delivery['status']) {
    this.state.deliveries = this.state.deliveries.map(d => {
      if (d.id === deliveryId) {
        return {
          ...d,
          status,
          deliveredTime: status === 'Entregado' ? new Date().toISOString() : d.deliveredTime
        };
      }
      return d;
    });
    this.saveState();
    this.notify();
  }
}

export const store = new StateStore();
