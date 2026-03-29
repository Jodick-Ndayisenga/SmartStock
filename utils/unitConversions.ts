// utils/unitConversions.ts
import { UNIT_OPTIONS } from '@/constants/unitOptions';

// ============================================================================
// TYPES
// ============================================================================

export type UnitType = 'piece' | 'weight' | 'volume' | 'length' | 'pack' | 'unite';

export type UnitInfo = {
  value: string;
  label: string;
  base: number;
  category: string;
  description: string;
  unitType: UnitType;
};

export interface ConversionResult {
  success: boolean;
  value: number;
  fromUnit: string;
  toUnit: string;
  originalValue: number;
  conversionFactor: number;
  error?: string;
  details?: {
    fromUnitInfo?: UnitInfo;
    toUnitInfo?: UnitInfo;
    path?: string[];
  };
}

export interface ConversionCheck {
  possible: boolean;
  reason?: string;
  suggestion?: string;
  conversionFactor?: number;
}

// ============================================================================
// CONVERSION ENGINE
// ============================================================================

class UnitConversionEngine {
  private static instance: UnitConversionEngine;
  private unitCache: Map<string, UnitInfo> = new Map();
  private conversionCache: Map<string, number> = new Map();

  private constructor() {
    this.initializeCache();
  }

  static getInstance(): UnitConversionEngine {
    if (!UnitConversionEngine.instance) {
      UnitConversionEngine.instance = new UnitConversionEngine();
    }
    return UnitConversionEngine.instance;
  }

  private initializeCache() {
    // Cache all units for faster lookup
    Object.values(UNIT_OPTIONS).forEach(unitArray => {
      unitArray.forEach(unit => {
        this.unitCache.set(unit.value, unit);
      });
    });
  }

  /**
   * Get unit info
   */
  getUnitInfo(unit: string): UnitInfo | undefined {
    return this.unitCache.get(unit);
  }

  /**
   * Check if two units are compatible (same type)
   */
  areUnitsCompatible(unit1: string, unit2: string): boolean {
    const info1 = this.getUnitInfo(unit1);
    const info2 = this.getUnitInfo(unit2);
    
    if (!info1 || !info2) return false;
    
    // Same unit type OR both are piece/pack (they can be mixed)
    if (info1.unitType === info2.unitType) return true;
    if (info1.unitType === 'piece' && info2.unitType === 'pack') return true;
    if (info1.unitType === 'pack' && info2.unitType === 'piece') return true;
    
    return false;
  }

  /**
   * Get conversion factor between two units
   */
  getConversionFactor(fromUnit: string, toUnit: string): number | null {
    // Check cache
    const cacheKey = `${fromUnit}:${toUnit}`;
    if (this.conversionCache.has(cacheKey)) {
      return this.conversionCache.get(cacheKey)!;
    }

    const fromInfo = this.getUnitInfo(fromUnit);
    const toInfo = this.getUnitInfo(toUnit);

    if (!fromInfo || !toInfo) return null;

    // Check compatibility
    if (!this.areUnitsCompatible(fromUnit, toUnit)) return null;

    // Direct conversion using base units
    // All units have a base (kg, l, m, piece)
    // So conversion is: (value * from.base) / to.base
    const factor = fromInfo.base / toInfo.base;
    
    // Cache the result
    this.conversionCache.set(cacheKey, factor);
    this.conversionCache.set(`${toUnit}:${fromUnit}`, 1 / factor);
    
    return factor;
  }

  /**
   * Convert between units with full safety
   */
  convert(
    fromUnit: string,
    toUnit: string,
    value: number
  ): ConversionResult {
    // Default result
    const defaultResult: ConversionResult = {
      success: true,
      value,
      fromUnit,
      toUnit,
      originalValue: value,
      conversionFactor: 1,
    };

    // Guard clauses
    if (!fromUnit || !toUnit) {
      return {
        ...defaultResult,
        success: false,
        error: 'Missing unit information',
      };
    }

    if (fromUnit === toUnit) {
      return defaultResult;
    }

    if (typeof value !== 'number' || isNaN(value)) {
      return {
        ...defaultResult,
        success: false,
        error: 'Invalid value for conversion',
      };
    }

    if (value === 0) {
      return defaultResult;
    }

    const fromInfo = this.getUnitInfo(fromUnit);
    const toInfo = this.getUnitInfo(toUnit);

    if (!fromInfo || !toInfo) {
      return {
        ...defaultResult,
        success: false,
        error: `Unknown unit: ${!fromInfo ? fromUnit : toUnit}`,
      };
    }

    // Check compatibility
    if (!this.areUnitsCompatible(fromUnit, toUnit)) {
      return {
        ...defaultResult,
        success: false,
        error: `Incompatible units: ${fromInfo.unitType} vs ${toInfo.unitType}`,
        details: {
          fromUnitInfo: fromInfo,
          toUnitInfo: toInfo,
        },
      };
    }

    // Perform conversion
    try {
      const conversionFactor = fromInfo.base / toInfo.base;
      const convertedValue = value * conversionFactor;

      return {
        success: true,
        value: convertedValue,
        fromUnit,
        toUnit,
        originalValue: value,
        conversionFactor,
        details: {
          fromUnitInfo: fromInfo,
          toUnitInfo: toInfo,
          path: [`1 ${fromUnit} = ${fromInfo.base} base units`, 
                 `1 ${toUnit} = ${toInfo.base} base units`,
                 `Conversion factor: ${conversionFactor.toFixed(4)}`],
        },
      };
    } catch (error) {
      return {
        ...defaultResult,
        success: false,
        error: error instanceof Error ? error.message : 'Conversion failed',
      };
    }
  }

  /**
   * Check if conversion is possible
   */
  canConvert(
    fromUnit: string,
    toUnit: string
  ): ConversionCheck {
    if (!fromUnit || !toUnit) {
      return { 
        possible: false, 
        reason: 'Missing unit information',
        suggestion: 'Please select both units',
      };
    }

    if (fromUnit === toUnit) {
      return { 
        possible: true,
        conversionFactor: 1,
      };
    }

    const fromInfo = this.getUnitInfo(fromUnit);
    const toInfo = this.getUnitInfo(toUnit);

    if (!fromInfo || !toInfo) {
      const unknownUnit = !fromInfo ? fromUnit : toUnit;
      return {
        possible: false,
        reason: `Unknown unit: ${unknownUnit}`,
        suggestion: 'Please select a valid unit',
      };
    }

    if (!this.areUnitsCompatible(fromUnit, toUnit)) {
      return {
        possible: false,
        reason: `Cannot convert ${fromInfo.unitType} to ${toInfo.unitType}`,
        suggestion: `Use units of the same type: ${fromInfo.unitType}`,
      };
    }

    const factor = fromInfo.base / toInfo.base;
    
    return {
      possible: true,
      conversionFactor: factor,
    };
  }

  /**
   * Get all units by type
   */
  getUnitsByType(type: UnitType): UnitInfo[] {
    return Array.from(this.unitCache.values())
      .filter(unit => unit.unitType === type);
  }

  /**
   * Get units by category within a type
   */
  getUnitsByCategory(type: UnitType, category: string): UnitInfo[] {
    return this.getUnitsByType(type)
      .filter(unit => unit.category === category);
  }

  /**
   * Get all categories for a unit type
   */
  getCategories(type: UnitType): string[] {
    const categories = new Set(
      this.getUnitsByType(type).map(unit => unit.category)
    );
    return Array.from(categories);
  }

  /**
   * Search units
   */
  searchUnits(query: string): UnitInfo[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.unitCache.values())
      .filter(unit => 
        unit.label.toLowerCase().includes(searchTerm) ||
        unit.value.toLowerCase().includes(searchTerm) ||
        unit.description.toLowerCase().includes(searchTerm)
      );
  }

  /**
   * Get suggested units for a product type
   */
  getSuggestedUnits(productCategory: string): UnitInfo[] {
    const suggestions: Record<string, UnitType[]> = {
      'food': ['weight', 'piece'],
      'drinks': ['volume', 'piece'],
      'clothing': ['piece', 'pack'],
      'electronics': ['piece'],
      'household': ['piece', 'pack'],
      'health': ['piece', 'pack'],
      'other': ['piece', 'weight', 'volume', 'length'],
    };

    const types = suggestions[productCategory] || ['piece'];
    return types.flatMap(type => this.getUnitsByType(type));
  }

  /**
   * Format conversion result
   */
  formatConversion(result: ConversionResult, decimals: number = 2): string {
    if (!result.success) {
      return `${result.originalValue} ${result.fromUnit} → Error: ${result.error}`;
    }

    const fromLabel = this.getUnitInfo(result.fromUnit)?.label || result.fromUnit;
    const toLabel = this.getUnitInfo(result.toUnit)?.label || result.toUnit;

    return `${result.originalValue.toFixed(decimals)} ${fromLabel} = ${result.value.toFixed(decimals)} ${toLabel}`;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.conversionCache.clear();
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const unitConverter = UnitConversionEngine.getInstance();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export const convertUnits = (
  fromUnit: string,
  toUnit: string,
  value: number
): ConversionResult => unitConverter.convert(fromUnit, toUnit, value);

export const canConvert = (
  fromUnit: string,
  toUnit: string
): ConversionCheck => unitConverter.canConvert(fromUnit, toUnit);

export const getUnitInfo = (unit: string): UnitInfo | undefined => 
  unitConverter.getUnitInfo(unit);

export const getUnitsByType = (type: UnitType): UnitInfo[] =>
  unitConverter.getUnitsByType(type);

export const getUnitsByCategory = (type: UnitType, category: string): UnitInfo[] =>
  unitConverter.getUnitsByCategory(type, category);

export const getCategories = (type: UnitType): string[] =>
  unitConverter.getCategories(type);

export const searchUnits = (query: string): UnitInfo[] =>
  unitConverter.searchUnits(query);

export const getSuggestedUnits = (productCategory: string): UnitInfo[] =>
  unitConverter.getSuggestedUnits(productCategory);

export const formatConversion = (
  result: ConversionResult,
  decimals: number = 2
): string => unitConverter.formatConversion(result, decimals);