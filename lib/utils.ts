// lib/utils.ts (alternative without dependencies)
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Format currency for Burundi Francs
export const formatCurrency = (amount: number): string => {
  return `₣${amount.toLocaleString('fr-FR')}`;
};

// Format stock quantity
export const formatStock = (quantity: number): string => {
  if (quantity === 0) return 'Out of stock';
  if (quantity < 10) return `Low (${quantity})`;
  return quantity.toString();
};