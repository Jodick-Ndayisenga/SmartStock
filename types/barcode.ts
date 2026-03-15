// types/barcode-scanner.types.ts
export interface Product {
  id: string | number;
  name: string;
  barcode: string;
  price?: number;
  stock?: number;
  category?: string;
  image?: string;
  [key: string]: any;
}

export interface ScannedBarcode {
  code: string;
  type: string;
  timestamp: number;
}

export interface BarcodeScannerProps {
  isVisible: boolean;
  onClose: () => void;
  onProductFound: (product: Product) => void;
  searchInDatabase: (barcode: string) => Promise<Product | null>;
  onError?: (error: Error) => void;
  theme?: 'light' | 'dark' | 'system';
}

export type ScannerStatus = 'idle' | 'scanning' | 'processing' | 'success' | 'error';