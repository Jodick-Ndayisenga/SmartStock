// utils/unitConversions.ts

export type VolumeUnit = 'l' | 'ml' | 'cl' | 'gal' | 'fl oz';
export type WeightUnit = 'kg' | 'g' | 'mg' | 'lb' | 'oz';
export type LengthUnit = 'm' | 'cm' | 'mm' | 'ft' | 'in';
export type PieceUnit = 'piece' | 'pack' | 'box' | 'case' | 'carton'|'bottle';

export type AnyUnit = VolumeUnit | WeightUnit | LengthUnit | PieceUnit;

// ============================================================================
// VOLUME CONVERSIONS
// ============================================================================

/**
 * Convert volume between different units
 */
export function convertVolume(
  fromUnit: VolumeUnit, 
  toUnit: VolumeUnit, 
  value: number
): number {
  if (fromUnit === toUnit) return value;

  const conversionFormulas: Record<string, (val: number) => number> = {
    // Liters to others
    'l→ml': (val) => val * 1000,
    'l→cl': (val) => val * 100,
    'l→gal': (val) => val * 0.264172,
    'l→fl oz': (val) => val * 33.814,
    
    // Milliliters to others
    'ml→l': (val) => val / 1000,
    'ml→cl': (val) => val / 10,
    'ml→gal': (val) => val * 0.000264172,
    'ml→fl oz': (val) => val * 0.033814,
    
    // Centiliters to others
    'cl→l': (val) => val / 100,
    'cl→ml': (val) => val * 10,
    'cl→gal': (val) => val * 0.00264172,
    'cl→fl oz': (val) => val * 0.33814,
    
    // Gallons to others
    'gal→l': (val) => val * 3.78541,
    'gal→ml': (val) => val * 3785.41,
    'gal→cl': (val) => val * 378.541,
    'gal→fl oz': (val) => val * 128,
    
    // Fluid ounces to others
    'fl oz→l': (val) => val * 0.0295735,
    'fl oz→ml': (val) => val * 29.5735,
    'fl oz→cl': (val) => val * 2.95735,
    'fl oz→gal': (val) => val * 0.0078125,
  };

  const conversionKey = `${fromUnit}→${toUnit}`;
  const formula = conversionFormulas[conversionKey];

  if (!formula) {
    throw new Error(`Unsupported volume conversion: ${fromUnit} to ${toUnit}`);
  }

  return formula(value);
}

// ============================================================================
// WEIGHT CONVERSIONS
// ============================================================================

/**
 * Convert weight between different units
 */
export function convertWeight(
  fromUnit: WeightUnit, 
  toUnit: WeightUnit, 
  value: number
): number {
  if (fromUnit === toUnit) return value;

  const conversionFormulas: Record<string, (val: number) => number> = {
    // Kilograms to others
    'kg→g': (val) => val * 1000,
    'kg→mg': (val) => val * 1000000,
    'kg→lb': (val) => val * 2.20462,
    'kg→oz': (val) => val * 35.274,
    
    // Grams to others
    'g→kg': (val) => val / 1000,
    'g→mg': (val) => val * 1000,
    'g→lb': (val) => val * 0.00220462,
    'g→oz': (val) => val * 0.035274,
    
    // Milligrams to others
    'mg→kg': (val) => val / 1000000,
    'mg→g': (val) => val / 1000,
    'mg→lb': (val) => val * 0.00000220462,
    'mg→oz': (val) => val * 0.000035274,
    
    // Pounds to others
    'lb→kg': (val) => val * 0.453592,
    'lb→g': (val) => val * 453.592,
    'lb→mg': (val) => val * 453592,
    'lb→oz': (val) => val * 16,
    
    // Ounces to others
    'oz→kg': (val) => val * 0.0283495,
    'oz→g': (val) => val * 28.3495,
    'oz→mg': (val) => val * 28349.5,
    'oz→lb': (val) => val * 0.0625,
  };

  const conversionKey = `${fromUnit}→${toUnit}`;
  const formula = conversionFormulas[conversionKey];

  if (!formula) {
    throw new Error(`Unsupported weight conversion: ${fromUnit} to ${toUnit}`);
  }

  return formula(value);
}

// ============================================================================
// LENGTH CONVERSIONS
// ============================================================================

/**
 * Convert length between different units
 */
export function convertLength(
  fromUnit: LengthUnit, 
  toUnit: LengthUnit, 
  value: number
): number {
  if (fromUnit === toUnit) return value;

  const conversionFormulas: Record<string, (val: number) => number> = {
    // Meters to others
    'm→cm': (val) => val * 100,
    'm→mm': (val) => val * 1000,
    'm→ft': (val) => val * 3.28084,
    'm→in': (val) => val * 39.3701,
    
    // Centimeters to others
    'cm→m': (val) => val / 100,
    'cm→mm': (val) => val * 10,
    'cm→ft': (val) => val * 0.0328084,
    'cm→in': (val) => val * 0.393701,
    
    // Millimeters to others
    'mm→m': (val) => val / 1000,
    'mm→cm': (val) => val / 10,
    'mm→ft': (val) => val * 0.00328084,
    'mm→in': (val) => val * 0.0393701,
    
    // Feet to others
    'ft→m': (val) => val * 0.3048,
    'ft→cm': (val) => val * 30.48,
    'ft→mm': (val) => val * 304.8,
    'ft→in': (val) => val * 12,
    
    // Inches to others
    'in→m': (val) => val * 0.0254,
    'in→cm': (val) => val * 2.54,
    'in→mm': (val) => val * 25.4,
    'in→ft': (val) => val * 0.0833333,
  };

  const conversionKey = `${fromUnit}→${toUnit}`;
  const formula = conversionFormulas[conversionKey];

  if (!formula) {
    throw new Error(`Unsupported length conversion: ${fromUnit} to ${toUnit}`);
  }

  return formula(value);
}

// ============================================================================
// PIECE/PACK CONVERSIONS
// ============================================================================

/**
 * Convert between piece/pack units (custom conversion factors)
 * Note: These are business-specific and may need customization
 */
export function convertPiece(
  fromUnit: PieceUnit, 
  toUnit: PieceUnit, 
  value: number,
  customConversionFactors?: Record<string, number>
): number {
  if (fromUnit === toUnit) return value;

  // Default conversion factors (can be overridden)
  const defaultConversionFactors: Record<string, number> = {
    'piece→pack': 1/12,      // 12 pieces = 1 pack
    'bottle→case':1/12,      // 12 bottles = 1 case
    'piece→box': 1/24,       // 24 pieces = 1 box
    'piece→case': 1/48,      // 48 pieces = 1 case
    'piece→carton': 1/96,    // 96 pieces = 1 carton
    
    'pack→piece': 12,        // 1 pack = 12 pieces
    'pack→box': 1/2,         // 2 packs = 1 box
    'pack→case': 1/4,        // 4 packs = 1 case
    'pack→carton': 1/8,      // 8 packs = 1 carton
    'case→bottle':12,        // 1 case = 12 bottles
    
    'box→piece': 24,         // 1 box = 24 pieces
    'box→pack': 2,           // 1 box = 2 packs
    'box→case': 1/2,         // 2 boxes = 1 case
    'box→carton': 1/4,       // 4 boxes = 1 carton
    
    'case→piece': 48,        // 1 case = 48 pieces
    'case→pack': 4,          // 1 case = 4 packs
    'case→box': 2,           // 1 case = 2 boxes
    'case→carton': 1/2,      // 2 cases = 1 carton
    
    'carton→piece': 96,      // 1 carton = 96 pieces
    'carton→pack': 8,        // 1 carton = 8 packs
    'carton→box': 4,         // 1 carton = 4 boxes
    'carton→case': 2,        // 1 carton = 2 cases
  };

  // Use custom factors if provided, otherwise use defaults
  const factors = { ...defaultConversionFactors, ...customConversionFactors };
  
  const conversionKey = `${fromUnit}→${toUnit}`;
  const conversionFactor = factors[conversionKey];

  if (conversionFactor === undefined) {
    throw new Error(`Unsupported piece conversion: ${fromUnit} to ${toUnit}`);
  }

  return value * conversionFactor;
}

// ============================================================================
// UNIVERSAL CONVERSION FUNCTION
// ============================================================================

/**
 * Universal conversion function that detects unit type and applies correct conversion
 */
export function convertUnits(
  fromUnit: AnyUnit, 
  toUnit: AnyUnit, 
  value: number,
  customPieceFactors?: Record<string, number>
): number {
  if (fromUnit === toUnit) return value;

  // Check if units are of the same type
  const volumeUnits: VolumeUnit[] = ['l', 'ml', 'cl', 'gal', 'fl oz'];
  const weightUnits: WeightUnit[] = ['kg', 'g', 'mg', 'lb', 'oz'];
  const lengthUnits: LengthUnit[] = ['m', 'cm', 'mm', 'ft', 'in'];
  const pieceUnits: PieceUnit[] = ['piece','pack', 'box', 'case', 'carton', 'bottle'];

  // Volume conversions
  if (volumeUnits.includes(fromUnit as VolumeUnit) && volumeUnits.includes(toUnit as VolumeUnit)) {
    return convertVolume(fromUnit as VolumeUnit, toUnit as VolumeUnit, value);
  }
  
  // Weight conversions
  if (weightUnits.includes(fromUnit as WeightUnit) && weightUnits.includes(toUnit as WeightUnit)) {
    return convertWeight(fromUnit as WeightUnit, toUnit as WeightUnit, value);
  }
  
  // Length conversions
  if (lengthUnits.includes(fromUnit as LengthUnit) && lengthUnits.includes(toUnit as LengthUnit)) {
    return convertLength(fromUnit as LengthUnit, toUnit as LengthUnit, value);
  }
  
  // Piece conversions
  if (pieceUnits.includes(fromUnit as PieceUnit) && pieceUnits.includes(toUnit as PieceUnit)) {
    return convertPiece(fromUnit as PieceUnit, toUnit as PieceUnit, value, customPieceFactors);
  }

  throw new Error(`Cannot convert between different unit types: ${fromUnit} to ${toUnit}`);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get conversion factor between two units
 */
export function getConversionFactor(
  fromUnit: AnyUnit, 
  toUnit: AnyUnit,
  customPieceFactors?: Record<string, number>
): number {
  if (fromUnit === toUnit) return 1;
  return convertUnits(fromUnit, toUnit, 1, customPieceFactors);
}

/**
 * Check if conversion between two units is supported
 */
export function isConversionSupported(
  fromUnit: AnyUnit, 
  toUnit: AnyUnit
): boolean {
  if (fromUnit === toUnit) return true;

  try {
    convertUnits(fromUnit, toUnit, 1);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect the type of unit
 */
export function getUnitType(unit: AnyUnit): 'volume' | 'weight' | 'length' | 'piece' {
  const volumeUnits: VolumeUnit[] = ['l', 'ml', 'cl', 'gal', 'fl oz'];
  const weightUnits: WeightUnit[] = ['kg', 'g', 'mg', 'lb', 'oz'];
  const lengthUnits: LengthUnit[] = ['m', 'cm', 'mm', 'ft', 'in'];
  const pieceUnits: PieceUnit[] = ['piece', 'pack', 'box', 'case', 'carton'];

  if (volumeUnits.includes(unit as VolumeUnit)) return 'volume';
  if (weightUnits.includes(unit as WeightUnit)) return 'weight';
  if (lengthUnits.includes(unit as LengthUnit)) return 'length';
  if (pieceUnits.includes(unit as PieceUnit)) return 'piece';
  
  throw new Error(`Unknown unit type: ${unit}`);
}