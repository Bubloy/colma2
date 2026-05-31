export interface Product {
  id: string;
  name: string;
  category: 'Bebidas' | 'Embutidos' | 'Víveres' | 'Despensa' | 'Limpieza' | 'Otros';
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  barcode: string;
}

export interface Client {
  id: string;
  name: string;
  nickname?: string;
  phone: string;
  creditLimit: number;
  balance: number;
}

export interface ColmadoSettings {
  isRegistered: boolean;
  name: string;
  rnc: string;
  phone: string;
  address: string;
  adminPin: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Sale {
  id: string;
  timestamp: string;
  items: SaleItem[];
  total: number;
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Fiao' | 'Mixto';
  clientId?: string; // If Fiao or Mixto
  clientName?: string;
  taxType: 'Consumo' | 'Crédito Fiscal' | 'Único';
  ncf?: string; // Comprobante Fiscal DGII
  cashReceived?: number;
  changeGiven?: number;
  isSynced: boolean;
  deliveryId?: string;
  paymentSplits?: {
    cash?: number;
    card?: number;
    transfer?: number;
    fiao?: number;
  };
}

export interface Delivery {
  id: string;
  saleId: string;
  clientName: string;
  address: string;
  phone: string;
  status: 'Recibido' | 'Preparando' | 'En Camino' | 'Entregado';
  riderName: string;
  assignedTime: string;
  deliveredTime?: string;
  coordinates?: { x: number; y: number }; // Simulated map coordinates
}

export interface CashJournal {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  salesCash: number;
  salesCard: number;
  salesTransfer: number;
  salesFiao: number;
  expenses: number;
  closedBalance?: number;
  expectedBalance?: number;
}

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Presidente Grande 650ml', category: 'Bebidas', price: 230, cost: 175, stock: 48, minStock: 15, barcode: '7460006001010' },
  { id: 'p2', name: 'Presidente Pequeña 355ml', category: 'Bebidas', price: 130, cost: 95, stock: 72, minStock: 24, barcode: '7460006001027' },
  { id: 'p3', name: 'Brugal Extra Viejo 700ml', category: 'Bebidas', price: 680, cost: 520, stock: 12, minStock: 5, barcode: '7460003001202' },
  { id: 'p4', name: 'Refresco Red Rock Frambuesa 20oz', category: 'Bebidas', price: 35, cost: 23, stock: 120, minStock: 30, barcode: '7460012002506' },
  { id: 'p5', name: 'Malta Morena 12oz', category: 'Bebidas', price: 45, cost: 32, stock: 60, minStock: 15, barcode: '7460006002024' },
  { id: 'p6', name: 'Agua Planeta Azul 500ml', category: 'Bebidas', price: 20, cost: 10, stock: 180, minStock: 40, barcode: '7460018001015' },
  
  { id: 'p7', name: 'Salami Induveca Súper Especial 1 Lb', category: 'Embutidos', price: 180, cost: 135, stock: 25, minStock: 8, barcode: '7460101001015' },
  { id: 'p8', name: 'Queso Amarillo Sosúa 1 Lb', category: 'Embutidos', price: 290, cost: 220, stock: 15, minStock: 5, barcode: '7460102001021' },
  { id: 'p9', name: 'Jamón Caserío Cocido 1 Lb', category: 'Embutidos', price: 250, cost: 190, stock: 18, minStock: 6, barcode: '7460103001037' },
  
  { id: 'p10', name: 'Plátano Verde (Unidad)', category: 'Víveres', price: 18, cost: 11, stock: 250, minStock: 50, barcode: '0000000000105' },
  { id: 'p11', name: 'Yuca Mocana 1 Lb', category: 'Víveres', price: 25, cost: 16, stock: 80, minStock: 20, barcode: '0000000000112' },
  { id: 'p12', name: 'Cebolla Roja 1 Lb', category: 'Víveres', price: 65, cost: 42, stock: 45, minStock: 10, barcode: '0000000000129' },
  
  { id: 'p13', name: 'Café Santo Domingo 8oz', category: 'Despensa', price: 125, cost: 95, stock: 40, minStock: 12, barcode: '7460002001050' },
  { id: 'p14', name: 'Arroz La Garza 1 Lb', category: 'Despensa', price: 42, cost: 32, stock: 150, minStock: 40, barcode: '7460015001056' },
  { id: 'p15', name: 'Habichuelas Rojas Goya (Lata)', category: 'Despensa', price: 70, cost: 52, stock: 65, minStock: 15, barcode: '041331021021' },
  { id: 'p16', name: 'Aceite Crisol 1 Litro', category: 'Despensa', price: 195, cost: 150, stock: 30, minStock: 10, barcode: '7460007001019' },
  { id: 'p17', name: 'Leche Rica Listamilk 1 Litro', category: 'Despensa', price: 95, cost: 72, stock: 55, minStock: 18, barcode: '7460008001025' },
  { id: 'p18', name: 'Pan de Agua (Unidad)', category: 'Despensa', price: 10, cost: 6, stock: 14, minStock: 30, barcode: '0000000000181' }, // Low stock trigger
  { id: 'p19', name: 'Huevo (Unidad)', category: 'Despensa', price: 8, cost: 5.5, stock: 300, minStock: 50, barcode: '0000000000198' },
  { id: 'p20', name: 'Chocolate Embajador (Tablilla)', category: 'Despensa', price: 15, cost: 10, stock: 120, minStock: 30, barcode: '7460021001019' },
  { id: 'p21', name: 'Sopita Maggi (Unidad)', category: 'Despensa', price: 8, cost: 5.8, stock: 400, minStock: 100, barcode: '7460025001015' },
  
  { id: 'p22', name: 'Jabón de Cuaba Hispano', category: 'Limpieza', price: 45, cost: 32, stock: 60, minStock: 15, barcode: '7460017001023' },
  { id: 'p23', name: 'Pasta Dental Colgate 100ml', category: 'Limpieza', price: 95, cost: 68, stock: 35, minStock: 10, barcode: '035000009520' },
  { id: 'p24', name: 'Cloro Macier 1/2 Galón', category: 'Limpieza', price: 65, cost: 45, stock: 28, minStock: 8, barcode: '7460123001024' }
];

export const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', name: 'Altagracia Pérez', nickname: 'Doña Altagracia', phone: '+18095551234', creditLimit: 4000, balance: 1850 },
  { id: 'c2', name: 'Ramón Mercedes', nickname: 'Don Ramón El Cojo', phone: '+18095552345', creditLimit: 5000, balance: 4620 }, // Near limit
  { id: 'c3', name: 'Carlos Manuel Tejada', nickname: 'Carlos El Pintor', phone: '+18295553456', creditLimit: 2000, balance: 350 },
  { id: 'c4', name: 'Carmen Rodríguez', nickname: 'Doña Carmen', phone: '+18495554567', creditLimit: 6000, balance: 0 },
  { id: 'c5', name: 'José Miguel "Delivery Fijo"', nickname: 'El Mello', phone: '+18095557890', creditLimit: 1500, balance: 1200 }
];

export const DOMINICAN_SECTORS = [
  { name: 'Naco', x: 250, y: 180 },
  { name: 'Piantini', x: 180, y: 150 },
  { name: 'Ensanche La Fe', x: 380, y: 120 },
  { name: 'Bella Vista', x: 120, y: 350 },
  { name: 'Los Prados', x: 100, y: 220 },
  { name: 'Zona Colonial', x: 550, y: 400 },
  { name: 'Gazcue', x: 450, y: 380 },
  { name: 'El Millón', x: 150, y: 260 }
];

export const DELIVERYS = [
  { id: 'd1', name: 'Wellington "El Rayo"', status: 'Disponible' },
  { id: 'd2', name: 'Brayan "Velo-G"', status: 'Disponible' },
  { id: 'd3', name: 'Junior "Moto-GP"', status: 'Disponible' }
];
