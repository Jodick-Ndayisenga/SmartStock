// database/models/Product.ts
import { Model, Query } from '@nozbe/watermelondb';
import { field, children, relation, writer } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import { BaseModel } from './BaseModel';
import { Shop } from './Shop';
import { StockMovement } from './StockMovement';

// Unit types for Burundi market
export type UnitType = 'piece' | 'weight' | 'volume' | 'length' | 'pack';
export type WeightUnit = 'kg' | 'g' | 'mg';
export type VolumeUnit = 'l' | 'ml' | 'cl';
export type LengthUnit = 'm' | 'cm' | 'mm';

type AnyUnit = WeightUnit | VolumeUnit | LengthUnit | string;

// -------------------
// Type Guard Helpers
// -------------------
function isWeightUnit(unit: string): unit is WeightUnit {
  return ['kg', 'g', 'mg'].includes(unit);
}

function isVolumeUnit(unit: string): unit is VolumeUnit {
  return ['l', 'ml', 'cl'].includes(unit);
}

function isLengthUnit(unit: string): unit is LengthUnit {
  return ['m', 'cm', 'mm'].includes(unit);
}

// -------------------
// Product Model
// -------------------
export class Product extends BaseModel {
  static table = 'products';

  static associations: Associations = {
    stock_movements: { type: 'has_many', foreignKey: 'product_id' },
    shops: { type: 'belongs_to', key: 'shop_id' },
  };

  // Core fields
  @field('name') name!: string;
  @field('sku') sku!: string;
  @field('barcode') barcode!: string;
  @field('category') category!: string;
  @field('description') description!: string;

  // Unit system - Enhanced
  @field('unit_type') unitType!: UnitType;
  @field('is_weighted') isWeighted!: boolean;
  @field('base_unit') baseUnit!: string;
  @field('purchase_unit') purchaseUnit!: string;
  @field('purchase_unit_size') purchaseUnitSize!: number;
  @field('selling_unit') sellingUnit!: string;
  @field('unit_conversion_factor') unitConversionFactor!: number;

  // Pricing (per base unit)
  @field('cost_price_per_base') costPricePerBase!: number;
  @field('selling_price_per_base') sellingPricePerBase!: number;
  @field('wholesale_price_per_base') wholesalePricePerBase!: number;

  // Inventory control
  @field('low_stock_threshold') lowStockThreshold!: number;
  @field('is_active') isActive!: boolean;
  @field('is_perishable') isPerishable!: boolean;
  @field('default_expiry_days') defaultExpiryDays!: number;

  // Image support
  @field('image_url') imageUrl?: string;
  @field('image_thumbnail_url') imageThumbnailUrl?: string;

  // Foreign key
  @field('shop_id') shopId!: string;

  // Relations
  @relation('shops', 'shop_id') shop!: Query<Shop>;
  @children('stock_movements') stockMovements!: Query<StockMovement>;

  // stock quantity (ALWAYS in base units)
  @field('stock_quantity') stockQuantity?: number;

  // Default values
  prepareCreate() {
    super.setDefaults();
    const defaults = {
      sku: '',
      barcode: '',
      category: 'Uncategorized',
      description: '',
      unitType: 'piece' as UnitType,
      isWeighted: false,
      baseUnit: 'piece',
      purchaseUnit: 'piece',
      purchaseUnitSize: 1,
      sellingUnit: 'piece',
      unitConversionFactor: 1,
      costPricePerBase: 0,
      sellingPricePerBase: 0,
      wholesalePricePerBase: 0,
      lowStockThreshold: 10,
      isActive: true,
      isPerishable: false,
      defaultExpiryDays: 0,
      imageUrl: '',
      imageThumbnailUrl: '',
      stockQuantity: 0,
    };

    Object.entries(defaults).forEach(([key, value]) => {
      if (this[key as keyof Product] === undefined || this[key as keyof Product] === null) {
        (this as any)[key] = value;
      }
    });
  }

  // Computed properties
  get displayName(): string {
    return `${this.name}${this.sku ? ` (${this.sku})` : ''}`;
  }

  // -------------------
  // Unit Conversion Methods
  // -------------------
  
  /**
   * Convert any unit to base units (your main conversion method)
   */
  convertToBaseUnit(quantity: number, fromUnit: AnyUnit): number {
    if (fromUnit === this.baseUnit) return quantity;

    switch (this.unitType) {
      case 'weight':
        if (isWeightUnit(fromUnit) && isWeightUnit(this.baseUnit)) {
          return this.convertWeight(quantity, fromUnit, this.baseUnit);
        }
        break;

      case 'volume':
        if (isVolumeUnit(fromUnit) && isVolumeUnit(this.baseUnit)) {
          return this.convertVolume(quantity, fromUnit, this.baseUnit);
        }
        break;

      case 'length':
        if (isLengthUnit(fromUnit) && isLengthUnit(this.baseUnit)) {
          return this.convertLength(quantity, fromUnit, this.baseUnit);
        }
        break;

      default:
        // fallback for piece, pack, etc.
        return quantity * this.unitConversionFactor;
    }

    // If conversion not applicable, return quantity as-is
    return quantity;
  }

  /**
   * Convert from selling units to base units
   */
  convertSellingToBaseUnits(sellingQuantity: number): number {
    if (this.sellingUnit === this.baseUnit) return sellingQuantity;
    return this.convertToBaseUnit(sellingQuantity, this.sellingUnit);
  }

  /**
   * Convert from base units to selling units  
   */
  convertBaseToSellingUnits(baseQuantity: number): number {
    if (this.sellingUnit === this.baseUnit) return baseQuantity;
    
    // For standard units, use the inverse conversion
    switch (this.unitType) {
      case 'weight':
        if (isWeightUnit(this.sellingUnit) && isWeightUnit(this.baseUnit)) {
          return this.convertWeight(baseQuantity, this.baseUnit, this.sellingUnit);
        }
        break;
      case 'volume':
        if (isVolumeUnit(this.sellingUnit) && isVolumeUnit(this.baseUnit)) {
          return this.convertVolume(baseQuantity, this.baseUnit, this.sellingUnit);
        }
        break;
      case 'length':
        if (isLengthUnit(this.sellingUnit) && isLengthUnit(this.baseUnit)) {
          return this.convertLength(baseQuantity, this.baseUnit, this.sellingUnit);
        }
        break;
      default:
        // For custom units, use conversion factor inverse
        return baseQuantity / this.unitConversionFactor;
    }
    
    return baseQuantity;
  }

  /**
   * Convert purchase quantity to base units
   */
  convertPurchaseToBaseUnits(purchaseQuantity: number): number {
    return purchaseQuantity * this.purchaseUnitSize;
  }

  /**
   * Get current stock in selling units (for display)
   */
  get currentStockInSellingUnits(): number {
    return this.convertBaseToSellingUnits(this.stockQuantity || 0);
  }

  /**
   * Get current stock in purchase units (for purchasing)
   */
  get currentStockInPurchaseUnits(): number {
    return (this.stockQuantity || 0) / this.purchaseUnitSize;
  }

  // -------------------
  // Financial Calculations
  // -------------------
  
  /**
   * Calculate total cost for a purchase
   */
  calculatePurchaseCost(purchaseQuantity: number): number {
    const baseUnits = this.convertPurchaseToBaseUnits(purchaseQuantity);
    return baseUnits * this.costPricePerBase;
  }

  /**
   * Calculate selling price for any quantity and unit
   */
  calculateSellingPrice(quantity: number, unit: string = this.sellingUnit): number {
    const baseQuantity = this.convertToBaseUnit(quantity, unit);
    return baseQuantity * this.sellingPricePerBase;
  }

  /**
   * Calculate cost price for any quantity and unit
   */
  calculateCostPrice(quantity: number, unit: string = this.purchaseUnit): number {
    const baseQuantity = this.convertToBaseUnit(quantity, unit);
    return baseQuantity * this.costPricePerBase;
  }

  /**
   * Calculate current stock value (cost basis)
   */
  get currentStockValue(): number {
    return (this.stockQuantity || 0) * this.costPricePerBase;
  }

  /**
   * Calculate potential revenue if all stock sold
   */
  get potentialRevenue(): number {
    const sellingUnits = this.currentStockInSellingUnits;
    return this.calculateSellingPrice(sellingUnits, this.sellingUnit);
  }

  /**
   * Calculate potential profit if all stock sold
   */
  get potentialProfit(): number {
    return this.potentialRevenue - this.currentStockValue;
  }

  /**
   * Calculate profit margin percentage
   */
  get profitMargin(): number {
    return this.costPricePerBase > 0 ? 
      ((this.sellingPricePerBase - this.costPricePerBase) / this.costPricePerBase) * 100 : 0;
  }

  /**
   * Check if stock is low
   */
  get isLowStock(): boolean {
    return (this.stockQuantity || 0) <= this.lowStockThreshold && (this.stockQuantity || 0) > 0;
  }

  /**
   * Check if out of stock
   */
  get isOutOfStock(): boolean {
    return (this.stockQuantity || 0) === 0;
  }

  /**
   * Check if stock is critical (out of stock and perishable)
   */
  get isCritical(): boolean {
    return this.isOutOfStock && this.isPerishable;
  }

  // -------------------
  // Stock Management Methods
  // -------------------
  
  /**
   * Add stock using purchase units
   */
  async addStock(purchaseQuantity: number): Promise<{ baseUnitsAdded: number; cost: number }> {
    const baseUnitsAdded = this.convertPurchaseToBaseUnits(purchaseQuantity);
    const cost = this.calculatePurchaseCost(purchaseQuantity);
    
    await this.update(record => {
      record.stockQuantity = (record.stockQuantity || 0) + baseUnitsAdded;
    });
    
    return { baseUnitsAdded, cost };
  }

  /**
   * Sell stock using selling units
   */
  async sellStock(sellingQuantity: number): Promise<{ baseUnitsSold: number; revenue: number }> {
    const baseUnitsSold = this.convertSellingToBaseUnits(sellingQuantity);
    const revenue = this.calculateSellingPrice(sellingQuantity, this.sellingUnit);
    
    await this.update(record => {
      record.stockQuantity = Math.max(0, (record.stockQuantity || 0) - baseUnitsSold);
    });
    
    return { baseUnitsSold, revenue };
  }

  /**
   * Adjust stock directly in base units
   */
  async adjustStock(baseQuantity: number): Promise<void> {
    await this.update(record => {
      record.stockQuantity = Math.max(0, baseQuantity);
    });
  }

  // -------------------
  // Display Helpers
  // -------------------
  get displayUnit(): string {
    return this.sellingUnit || this.baseUnit;
  }

  formatQuantity(quantity: number, unit?: string): string {
    const displayUnit = unit || this.displayUnit;
    return `${quantity} ${displayUnit}`;
  }

  formatPrice(quantity: number, unit?: string): string {
    const price = this.calculateSellingPrice(quantity, unit);
    return `₣${price.toFixed(2)}`;
  }

  /**
   * Format current stock for display
   */
  get formattedCurrentStock(): string {
    return this.formatQuantity(this.currentStockInSellingUnits, this.sellingUnit);
  }

  /**
   * Format stock value for display
   */
  get formattedStockValue(): string {
    return `₣${this.currentStockValue.toLocaleString('fr-FR')}`;
  }

  // -------------------
  // Private Conversion Methods
  // -------------------
  private convertWeight(quantity: number, from: WeightUnit, to: WeightUnit): number {
    const conversions: Record<WeightUnit, Partial<Record<WeightUnit, number>>> = {
      kg: { g: 1000, mg: 1_000_000 },
      g: { kg: 0.001, mg: 1000 },
      mg: { kg: 0.000001, g: 0.001 },
    };
    return quantity * (conversions[from][to] ?? 1);
  }

  private convertVolume(quantity: number, from: VolumeUnit, to: VolumeUnit): number {
    const conversions: Record<VolumeUnit, Partial<Record<VolumeUnit, number>>> = {
      l: { ml: 1000, cl: 100 },
      ml: { l: 0.001, cl: 0.1 },
      cl: { l: 0.01, ml: 10 },
    };
    return quantity * (conversions[from][to] ?? 1);
  }

  private convertLength(quantity: number, from: LengthUnit, to: LengthUnit): number {
    const conversions: Record<LengthUnit, Partial<Record<LengthUnit, number>>> = {
      m: { cm: 100, mm: 1000 },
      cm: { m: 0.01, mm: 10 },
      mm: { m: 0.001, cm: 0.1 },
    };
    return quantity * (conversions[from][to] ?? 1);
  }
}