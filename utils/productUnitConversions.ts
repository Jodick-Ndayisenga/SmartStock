// utils/productUnitConversions.ts
import { unitConverter, UnitType, ConversionResult, UnitInfo } from './unitConversions';

export interface ProductUnits {
  unitType: UnitType;
  baseUnit: string;
  purchaseUnit: string;
  purchaseUnitSize: number;
  sellingUnit: string;
}

export interface ProductConversionMatrix {
  purchaseToSelling: ConversionResult;
  sellingToPurchase: ConversionResult;
  purchaseToBase: ConversionResult;
  sellingToBase: ConversionResult;
  baseToPurchase: ConversionResult;
  baseToSelling: ConversionResult;
  stockInAllUnits: Record<string, ConversionResult>;
}

export interface PriceConversionResult {
  success: boolean;
  pricePerSellingUnit: number;
  pricePerBaseUnit: number;
  pricePerPurchaseUnit: number;
  margin: number;
  markup: number;
  breakEvenUnits: number;
  conversionFactor: number;
  error?: string;
  details?: {
    purchaseUnitInfo?: UnitInfo;
    sellingUnitInfo?: UnitInfo;
    baseUnitInfo?: UnitInfo;
  };
}

// ============================================================================
// CORE CONVERSION FUNCTIONS
// ============================================================================

/**
 * Get the base unit value for any unit
 */
export function getBaseUnitValue(unit: string): number {
  const unitInfo = unitConverter.getUnitInfo(unit);
  return unitInfo?.base || 1;
}

/**
 * Convert product stock between units with proper handling of purchase unit size
 */
export function convertProductStock(
  product: ProductUnits,
  fromUnit: string,
  toUnit: string,
  quantity: number
): ConversionResult {
  // Guard clauses
  if (!fromUnit || !toUnit) {
    return {
      success: false,
      value: quantity,
      fromUnit,
      toUnit,
      originalValue: quantity,
      conversionFactor: 1,
      error: 'Missing unit information',
    };
  }

  if (fromUnit === toUnit) {
    return {
      success: true,
      value: quantity,
      fromUnit,
      toUnit,
      originalValue: quantity,
      conversionFactor: 1,
    };
  }

  if (typeof quantity !== 'number' || isNaN(quantity)) {
    return {
      success: false,
      value: 0,
      fromUnit,
      toUnit,
      originalValue: quantity,
      conversionFactor: 1,
      error: 'Invalid quantity',
    };
  }

  if (quantity === 0) {
    return {
      success: true,
      value: 0,
      fromUnit,
      toUnit,
      originalValue: 0,
      conversionFactor: 1,
    };
  }

  // Get unit info
  const fromInfo = unitConverter.getUnitInfo(fromUnit);
  const toInfo = unitConverter.getUnitInfo(toUnit);
  
  if (!fromInfo || !toInfo) {
    return {
      success: false,
      value: quantity,
      fromUnit,
      toUnit,
      originalValue: quantity,
      conversionFactor: 1,
      error: `Unit info not found: ${!fromInfo ? fromUnit : toUnit}`,
    };
  }

  // Check compatibility
  if (fromInfo.unitType !== toInfo.unitType) {
    // Special case: piece and pack are compatible
    const isPiecePack = (fromInfo.unitType === 'piece' && toInfo.unitType === 'pack') ||
                       (fromInfo.unitType === 'pack' && toInfo.unitType === 'piece');
    
    if (!isPiecePack) {
      return {
        success: false,
        value: quantity,
        fromUnit,
        toUnit,
        originalValue: quantity,
        conversionFactor: 1,
        error: `Incompatible unit types: ${fromInfo.unitType} to ${toInfo.unitType}`,
      };
    }
  }

  // ===== SPECIAL CASE: Using product's purchase unit size =====
  
  // Case 1: Purchase unit to base unit (use purchaseUnitSize)
  if (fromUnit === product.purchaseUnit && toUnit === product.baseUnit) {
    const result = quantity * product.purchaseUnitSize;
    return {
      success: true,
      value: result,
      fromUnit,
      toUnit,
      originalValue: quantity,
      conversionFactor: product.purchaseUnitSize,
      details: {
        path: [`1 ${fromUnit} = ${product.purchaseUnitSize} ${toUnit} (product setting)`],
      },
    };
  }

  // Case 2: Base unit to purchase unit (inverse of purchaseUnitSize)
  if (fromUnit === product.baseUnit && toUnit === product.purchaseUnit) {
    const result = quantity / product.purchaseUnitSize;
    return {
      success: true,
      value: result,
      fromUnit,
      toUnit,
      originalValue: quantity,
      conversionFactor: 1 / product.purchaseUnitSize,
      details: {
        path: [`1 ${fromUnit} = ${(1 / product.purchaseUnitSize).toFixed(4)} ${toUnit} (inverse of product setting)`],
      },
    };
  }

  // Case 3: Purchase unit to selling unit (through base unit)
  if (fromUnit === product.purchaseUnit && toUnit === product.sellingUnit) {
    // First convert purchase to base
    const inBaseUnits = quantity * product.purchaseUnitSize;
    // Then convert base to selling
    const sellingUnitBase = getBaseUnitValue(product.sellingUnit);
    const result = inBaseUnits / sellingUnitBase;
    
    return {
      success: true,
      value: result,
      fromUnit,
      toUnit,
      originalValue: quantity,
      conversionFactor: product.purchaseUnitSize / sellingUnitBase,
      details: {
        path: [
          `1. Converted ${quantity} ${fromUnit} to ${inBaseUnits} ${product.baseUnit} (using purchaseUnitSize: ${product.purchaseUnitSize})`,
          `2. Converted ${inBaseUnits} ${product.baseUnit} to ${result.toFixed(2)} ${toUnit} (1 ${toUnit} = ${sellingUnitBase} ${product.baseUnit})`,
        ],
      },
    };
  }

  // Case 4: Selling unit to purchase unit (through base unit)
  if (fromUnit === product.sellingUnit && toUnit === product.purchaseUnit) {
    // First convert selling to base
    const sellingUnitBase = getBaseUnitValue(product.sellingUnit);
    const inBaseUnits = quantity * sellingUnitBase;
    // Then convert base to purchase
    const result = inBaseUnits / product.purchaseUnitSize;
    
    return {
      success: true,
      value: result,
      fromUnit,
      toUnit,
      originalValue: quantity,
      conversionFactor: sellingUnitBase / product.purchaseUnitSize,
      details: {
        path: [
          `1. Converted ${quantity} ${fromUnit} to ${inBaseUnits} ${product.baseUnit} (1 ${fromUnit} = ${sellingUnitBase} ${product.baseUnit})`,
          `2. Converted ${inBaseUnits} ${product.baseUnit} to ${result.toFixed(2)} ${toUnit} (using purchaseUnitSize: ${product.purchaseUnitSize})`,
        ],
      },
    };
  }

  // ===== GENERAL CASE: Any other conversion through base unit =====
  
  // Step 1: Convert fromUnit to base units
  let inBaseUnits: number;
  let step1Factor: number;
  
  if (fromUnit === product.purchaseUnit) {
    inBaseUnits = quantity * product.purchaseUnitSize;
    step1Factor = product.purchaseUnitSize;
  } else if (fromUnit === product.baseUnit) {
    inBaseUnits = quantity;
    step1Factor = 1;
  } else {
    // Use standard conversion to base unit
    const fromUnitBase = getBaseUnitValue(fromUnit);
    inBaseUnits = quantity * fromUnitBase;
    step1Factor = fromUnitBase;
  }

  // Step 2: Convert from base units to toUnit
  let result: number;
  let step2Factor: number;
  
  if (toUnit === product.baseUnit) {
    result = inBaseUnits;
    step2Factor = 1;
  } else if (toUnit === product.purchaseUnit) {
    result = inBaseUnits / product.purchaseUnitSize;
    step2Factor = 1 / product.purchaseUnitSize;
  } else {
    const toUnitBase = getBaseUnitValue(toUnit);
    result = inBaseUnits / toUnitBase;
    step2Factor = 1 / toUnitBase;
  }

  return {
    success: true,
    value: result,
    fromUnit,
    toUnit,
    originalValue: quantity,
    conversionFactor: step1Factor * step2Factor,
    details: {
      path: [
        `1. Converted to base: ${quantity} ${fromUnit} → ${inBaseUnits.toFixed(2)} ${product.baseUnit}`,
        `2. Converted from base: ${inBaseUnits.toFixed(2)} ${product.baseUnit} → ${result.toFixed(2)} ${toUnit}`,
      ],
    },
  };
}

/**
 * Calculate conversion matrix for a product
 */
export function calculateConversionMatrix(
  product: ProductUnits
): ProductConversionMatrix {
  const {
    baseUnit,
    purchaseUnit,
    purchaseUnitSize,
    sellingUnit,
  } = product;

  // Get unit info
  const purchaseUnitInfo = unitConverter.getUnitInfo(purchaseUnit);
  const sellingUnitInfo = unitConverter.getUnitInfo(sellingUnit);
  const baseUnitInfo = unitConverter.getUnitInfo(baseUnit);

  // Default values if info not found
  const purchaseToBase = purchaseUnitSize; // Base units per purchase unit
  const sellingToBase = sellingUnitInfo?.base || 1; // Base units per selling unit

  // Calculate conversions
  const purchaseToSellingFactor = purchaseToBase / sellingToBase;
  const purchaseToSellingValue = 1 * purchaseToSellingFactor;

  const sellingToPurchaseFactor = sellingToBase / purchaseToBase;
  const sellingToPurchaseValue = 1 * sellingToPurchaseFactor;

  // Purchase to Base
  const purchaseToBaseResult: ConversionResult = {
    success: true,
    value: purchaseToBase,
    fromUnit: purchaseUnit,
    toUnit: baseUnit,
    originalValue: 1,
    conversionFactor: purchaseToBase,
    details: {
      path: [`1 ${purchaseUnit} = ${purchaseToBase} ${baseUnit} (product setting)`],
    },
  };

  // Selling to Base
  const sellingToBaseResult: ConversionResult = {
    success: true,
    value: sellingToBase,
    fromUnit: sellingUnit,
    toUnit: baseUnit,
    originalValue: 1,
    conversionFactor: sellingToBase,
    details: {
      path: [`1 ${sellingUnit} = ${sellingToBase} ${baseUnit} (standard conversion)`],
    },
  };

  // Base to Purchase
  const baseToPurchaseResult: ConversionResult = {
    success: true,
    value: 1 / purchaseToBase,
    fromUnit: baseUnit,
    toUnit: purchaseUnit,
    originalValue: 1,
    conversionFactor: 1 / purchaseToBase,
    details: {
      path: [`1 ${baseUnit} = ${(1 / purchaseToBase).toFixed(4)} ${purchaseUnit}`],
    },
  };

  // Base to Selling
  const baseToSellingResult: ConversionResult = {
    success: true,
    value: 1 / sellingToBase,
    fromUnit: baseUnit,
    toUnit: sellingUnit,
    originalValue: 1,
    conversionFactor: 1 / sellingToBase,
    details: {
      path: [`1 ${baseUnit} = ${(1 / sellingToBase).toFixed(4)} ${sellingUnit}`],
    },
  };

  // Purchase to Selling
  const purchaseToSellingResult: ConversionResult = {
    success: true,
    value: purchaseToSellingValue,
    fromUnit: purchaseUnit,
    toUnit: sellingUnit,
    originalValue: 1,
    conversionFactor: purchaseToSellingFactor,
    details: {
      path: [
        `1 ${purchaseUnit} = ${purchaseToBase} ${baseUnit}`,
        `1 ${sellingUnit} = ${sellingToBase} ${baseUnit}`,
        `Therefore: 1 ${purchaseUnit} = ${purchaseToSellingValue.toFixed(2)} ${sellingUnit}`,
      ],
    },
  };

  // Selling to Purchase
  const sellingToPurchaseResult: ConversionResult = {
    success: true,
    value: sellingToPurchaseValue,
    fromUnit: sellingUnit,
    toUnit: purchaseUnit,
    originalValue: 1,
    conversionFactor: sellingToPurchaseFactor,
    details: {
      path: [
        `1 ${sellingUnit} = ${sellingToBase} ${baseUnit}`,
        `1 ${purchaseUnit} = ${purchaseToBase} ${baseUnit}`,
        `Therefore: 1 ${sellingUnit} = ${sellingToPurchaseValue.toFixed(2)} ${purchaseUnit}`,
      ],
    },
  };

  // Stock in all units (for a quantity of 1 base unit)
  const stockInAllUnits: Record<string, ConversionResult> = {};

  stockInAllUnits[baseUnit] = {
    success: true,
    value: 1,
    fromUnit: baseUnit,
    toUnit: baseUnit,
    originalValue: 1,
    conversionFactor: 1,
  };

  stockInAllUnits[purchaseUnit] = {
    success: true,
    value: 1 / purchaseToBase,
    fromUnit: baseUnit,
    toUnit: purchaseUnit,
    originalValue: 1,
    conversionFactor: 1 / purchaseToBase,
  };

  stockInAllUnits[sellingUnit] = {
    success: true,
    value: 1 / sellingToBase,
    fromUnit: baseUnit,
    toUnit: sellingUnit,
    originalValue: 1,
    conversionFactor: 1 / sellingToBase,
  };

  return {
    purchaseToSelling: purchaseToSellingResult,
    sellingToPurchase: sellingToPurchaseResult,
    purchaseToBase: purchaseToBaseResult,
    sellingToBase: sellingToBaseResult,
    baseToPurchase: baseToPurchaseResult,
    baseToSelling: baseToSellingResult,
    stockInAllUnits,
  };
}

// ============================================================================
// PRICE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate price metrics from product data
 */
export function calculatePriceMetrics(
  product: ProductUnits,
  purchaseTotalCost: number,
  purchaseQuantity: number,
  sellingPrice: number
): PriceConversionResult {
  // Guard clauses
  if (purchaseQuantity <= 0) {
    return {
      success: false,
      pricePerSellingUnit: 0,
      pricePerBaseUnit: 0,
      pricePerPurchaseUnit: 0,
      margin: 0,
      markup: 0,
      breakEvenUnits: 0,
      conversionFactor: 0,
      error: 'Purchase quantity must be greater than zero',
    };
  }

  if (purchaseTotalCost < 0) {
    return {
      success: false,
      pricePerSellingUnit: 0,
      pricePerBaseUnit: 0,
      pricePerPurchaseUnit: 0,
      margin: 0,
      markup: 0,
      breakEvenUnits: 0,
      conversionFactor: 0,
      error: 'Total cost cannot be negative',
    };
  }

  if (sellingPrice < 0) {
    return {
      success: false,
      pricePerSellingUnit: 0,
      pricePerBaseUnit: 0,
      pricePerPurchaseUnit: 0,
      margin: 0,
      markup: 0,
      breakEvenUnits: 0,
      conversionFactor: 0,
      error: 'Selling price cannot be negative',
    };
  }

  // Get unit info
  const purchaseUnitInfo = unitConverter.getUnitInfo(product.purchaseUnit);
  const sellingUnitInfo = unitConverter.getUnitInfo(product.sellingUnit);
  const baseUnitInfo = unitConverter.getUnitInfo(product.baseUnit);

  if (!purchaseUnitInfo || !sellingUnitInfo || !baseUnitInfo) {
    return {
      success: false,
      pricePerSellingUnit: 0,
      pricePerBaseUnit: 0,
      pricePerPurchaseUnit: 0,
      margin: 0,
      markup: 0,
      breakEvenUnits: 0,
      conversionFactor: 0,
      error: 'Invalid unit information',
      details: {
        purchaseUnitInfo,
        sellingUnitInfo,
        baseUnitInfo,
      },
    };
  }

  // Calculate base units per purchase unit (using product.purchaseUnitSize which might be custom)
  const baseUnitsPerPurchaseUnit = product.purchaseUnitSize;
  
  // Calculate base units per selling unit (from unit info)
  const baseUnitsPerSellingUnit = sellingUnitInfo.base;

  // Calculate prices
  const pricePerPurchaseUnit = purchaseTotalCost / purchaseQuantity;
  const pricePerBaseUnit = pricePerPurchaseUnit / baseUnitsPerPurchaseUnit;
  const pricePerSellingUnit = pricePerBaseUnit * baseUnitsPerSellingUnit;

  // Calculate margins
  const profit = sellingPrice - pricePerSellingUnit;
  const margin = pricePerSellingUnit > 0 ? (profit / pricePerSellingUnit) * 100 : 0;
  const markup = pricePerSellingUnit > 0 ? (profit / pricePerSellingUnit) * 100 : 0;

  // Break-even point (units to sell to recover cost)
  const breakEvenUnits = profit > 0 
    ? purchaseTotalCost / profit 
    : Infinity;

  // Conversion factor from purchase to selling
  const conversionFactor = baseUnitsPerPurchaseUnit / baseUnitsPerSellingUnit;

  return {
    success: true,
    pricePerSellingUnit,
    pricePerBaseUnit,
    pricePerPurchaseUnit,
    margin,
    markup,
    breakEvenUnits,
    conversionFactor,
    details: {
      purchaseUnitInfo,
      sellingUnitInfo,
      baseUnitInfo,
    },
  };
}

// ============================================================================
// UNIT SUGGESTION FUNCTIONS
// ============================================================================

/**
 * Suggest optimal selling unit based on price
 */
export function suggestOptimalSellingUnit(
  product: ProductUnits,
  sellingPrice: number
): Array<{ unit: string; price: number; label: string; baseValue: number }> {
  const suggestions: Array<{ unit: string; price: number; label: string; baseValue: number }> = [];
  
  const units = unitConverter.getUnitsByType(product.unitType);
  
  units.forEach(unit => {
    if (unit.value === product.sellingUnit) return;
    
    const conversion = unitConverter.convert(product.sellingUnit, unit.value, sellingPrice);
    if (conversion.success) {
      suggestions.push({
        unit: unit.value,
        price: conversion.value,
        label: unit.label,
        baseValue: unit.base,
      });
    }
  });
  
  // Sort by price (ascending)
  return suggestions.sort((a, b) => a.price - b.price);
}

/**
 * Get default base unit for a unit type
 */
export function getDefaultBaseUnit(unitType: UnitType): string {
  const defaults: Record<UnitType, string> = {
    weight: 'kg',
    volume: 'l',
    length: 'm',
    piece: 'piece',
    pack: 'piece', // Pack's base unit is still piece
  };
  
  return defaults[unitType] || 'piece';
}

/**
 * Get default unit for a unit type (first unit in the list)
 */
export function getDefaultUnit(unitType: UnitType): string {
  const defaults: Record<UnitType, string> = {
    weight: 'kg',
    volume: 'l',
    length: 'm',
    piece: 'piece',
    pack: 'pack_6',
  };
  
  return defaults[unitType] || 'piece';
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate product units
 */
export function validateProductUnits(product: ProductUnits): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const baseInfo = unitConverter.getUnitInfo(product.baseUnit);
  const purchaseInfo = unitConverter.getUnitInfo(product.purchaseUnit);
  const sellingInfo = unitConverter.getUnitInfo(product.sellingUnit);

  if (!baseInfo) {
    errors.push(`Base unit "${product.baseUnit}" is invalid`);
  }

  if (!purchaseInfo) {
    errors.push(`Purchase unit "${product.purchaseUnit}" is invalid`);
  } 

  if (!sellingInfo) {
    errors.push(`Selling unit "${product.sellingUnit}" is invalid`);
  }

  if (product.purchaseUnitSize <= 0) {
    errors.push('Purchase unit size must be greater than zero');
  }

  

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a conversion is valid for this product
 */
export function canConvertForProduct(
  product: ProductUnits,
  fromUnit: string,
  toUnit: string
): boolean {
  const result = convertProductStock(product, fromUnit, toUnit, 1);
  return result.success;
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format price with unit
 */
export function formatPriceWithUnit(
  price: number,
  unit: string,
  currency: string = 'FBU'
): string {
  const unitInfo = unitConverter.getUnitInfo(unit);
  const unitLabel = unitInfo?.label || unit;
  
  return `${price.toFixed(2)} ${currency} / ${unitLabel}`;
}

/**
 * Format conversion result with optional decimals
 */
export function formatConversionResult(
  result: ConversionResult,
  decimals: number = 2
): string {
  if (!result.success) {
    return `${result.originalValue} ${result.fromUnit} → ${result.error}`;
  }

  return `${result.originalValue.toFixed(decimals)} ${result.fromUnit} = ${result.value.toFixed(decimals)} ${result.toUnit}`;
}

/**
 * Get human-readable conversion explanation
 */
export function getConversionExplanation(
  product: ProductUnits,
  fromUnit: string,
  toUnit: string
): string[] {
  const result = convertProductStock(product, fromUnit, toUnit, 1);
  
  if (!result.success || !result.details?.path) {
    return ['Conversion not available'];
  }

  return result.details.path;
}

// ============================================================================
// EXAMPLE DEMONSTRATION
// ============================================================================

/**
 * Get example conversion for demonstration
 * Useful for showing users how conversions work
 */
export function getConversionExample(
  product: ProductUnits
): { description: string; calculation: string } {
  const { purchaseUnit, sellingUnit, purchaseUnitSize } = product;
  
  const purchaseInfo = unitConverter.getUnitInfo(purchaseUnit);
  const sellingInfo = unitConverter.getUnitInfo(sellingUnit);
  
  if (!purchaseInfo || !sellingInfo) {
    return {
      description: 'Example non disponible',
      calculation: 'Unités invalides',
    };
  }

  const purchaseToSelling = purchaseUnitSize / sellingInfo.base;
  
  return {
    description: `Conversion ${purchaseUnit} → ${sellingUnit}`,
    calculation: `1 ${purchaseUnit} (${purchaseUnitSize} ${product.baseUnit}) = ${purchaseToSelling.toFixed(2)} ${sellingUnit} (${sellingInfo.base} ${product.baseUnit} par unité)`,
  };
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export default {
  convertProductStock,
  calculateConversionMatrix,
  calculatePriceMetrics,
  suggestOptimalSellingUnit,
  getDefaultBaseUnit,
  getDefaultUnit,
  validateProductUnits,
  canConvertForProduct,
  formatPriceWithUnit,
  formatConversionResult,
  getConversionExplanation,
  getConversionExample,
  getBaseUnitValue,
};