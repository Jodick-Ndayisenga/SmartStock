// types/sales.ts
export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';
export type PaymentMode = 'cash' | 'credit';
export type ViewMode = 'grid' | 'list';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  imageUrl?: string;
  baseUnit: string;
  unitType: string;
  baseQuantity: number;
}

export interface QuickAmount {
  label: string;
  value: number;
  unit?: string;
  baseQuantity: number;
  isAvailable: boolean;
}

export interface QueuedSale {
  id: string;
  cart: CartItem[];
  paymentMode: PaymentMode;
  selectedCustomer: string | null;
  dueDate: number | null;
  creditTerms: string;
  totalAmount: number;
  timestamp: number;
  shopId: string;
  userId: string;
}