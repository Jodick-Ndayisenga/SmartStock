// src/services/StockService.ts
import database from '@/database';
import { Product } from '@/database/models/Product';
import { StockMovement, MovementType } from '@/database/models/StockMovement';
import { Q } from '@nozbe/watermelondb';

export interface StockMovementInput {
  productId: string;
  shopId: string;
  quantity: number;
  movementType: MovementType;
  batchNumber?: string;
  expiryDate?: number;
  supplierId?: string;
  customerId?: string;
  referenceId?: string;
  notes?: string;
  recordedBy?: string;
  timestamp?: number;
  // Add this new parameter to control whether to use a separate write
  useExistingWriter?: boolean;
  // Add this to pass the current writer's database instance if needed
  existingWriter?: any;
}

export class StockService {
  /**
   * Atomic stock update: creates movement + updates product.stockQuantity in one transaction
   * Now supports being called within an existing writer
   */
  static async recordMovement(input: StockMovementInput): Promise<void> {
    const {
      productId,
      shopId,
      quantity,
      movementType,
      batchNumber,
      expiryDate,
      supplierId,
      customerId,
      referenceId,
      notes,
      recordedBy,
      timestamp = Date.now(),
      useExistingWriter = false,
      existingWriter = null
    } = input;

    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    // If we're using an existing writer, just execute the operations directly
    if (useExistingWriter && existingWriter) {
      console.log('[StockService] Using existing writer for stock movement');
      await this.performStockMovement({
        productId,
        shopId,
        quantity,
        movementType,
        batchNumber,
        expiryDate,
        supplierId,
        customerId,
        referenceId,
        notes,
        recordedBy,
        timestamp
      });
      return;
    }

    // Otherwise, create a new writer
    console.log('[StockService] Creating new writer for stock movement');
    return await database.write(async () => {
      await this.performStockMovement({
        productId,
        shopId,
        quantity,
        movementType,
        batchNumber,
        expiryDate,
        supplierId,
        customerId,
        referenceId,
        notes,
        recordedBy,
        timestamp
      });
    });
  }

  /**
   * Internal method to perform the actual stock movement operations
   * This can be called within an existing writer
   */
  static async performStockMovement(input: {
    productId: string;
    shopId: string;
    quantity: number;
    movementType: MovementType;
    batchNumber?: string;
    expiryDate?: number;
    supplierId?: string;
    customerId?: string;
    referenceId?: string;
    notes?: string;
    recordedBy?: string;
    timestamp: number;
  }): Promise<void> {
    const {
      productId,
      shopId,
      quantity,
      movementType,
      batchNumber,
      expiryDate,
      supplierId,
      customerId,
      referenceId,
      notes,
      recordedBy,
      timestamp,
    } = input;

    // 1. Fetch product
    const product = await database.get<Product>('products').find(productId);

    // 2. Create movement - Use proper WatermelonDB pattern
    await database.get<StockMovement>('stock_movements').create(movement => {
      // Required fields
      (movement as any).productId = productId;
      (movement as any).shopId = shopId;
      (movement as any).quantity = quantity;
      (movement as any).movementType = movementType;
      (movement as any).timestamp = timestamp;
      
      // Optional fields - only set if they exist
      if (batchNumber) (movement as any).batchNumber = batchNumber;
      if (expiryDate) (movement as any).expiryDate = expiryDate;
      if (supplierId) (movement as any).supplierId = supplierId;
      if (customerId) (movement as any).customerId = customerId;
      if (referenceId) (movement as any).referenceId = referenceId;
      if (notes) (movement as any).notes = notes;
      if (recordedBy) (movement as any).recordedBy = recordedBy;
    });

    // 3. Update stock quantity
    const stockDelta = movementType === 'IN' || movementType === 'TRANSFER_IN' 
      ? quantity 
      : -quantity;

    await product.update(p => {
      p.stockQuantity = Math.max(0, (p.stockQuantity || 0) + stockDelta);
    });

    console.log(`[StockService] ${movementType} ${quantity} units → ${product.name}. New stock: ${product.stockQuantity}`);
  }

  /**
   * Helper: Record a sale (most common use case)
   */
  static async recordSale({
    productId,
    shopId,
    quantityInSellingUnits,
    customerId,
    recordedBy,
    notes,
    useExistingWriter = false,
    existingWriter = null
  }: {
    productId: string;
    shopId: string;
    quantityInSellingUnits: number;
    customerId?: string;
    recordedBy?: string;
    notes?: string;
    useExistingWriter?: boolean;
    existingWriter?: any;
  }): Promise<void> {
    const product = await database.get<Product>('products').find(productId);
    
    // Convert selling units → base units for storage
    const quantityInBase = product.convertToBaseUnit(quantityInSellingUnits, product.sellingUnit);

    return this.recordMovement({
      productId,
      shopId,
      quantity: quantityInBase,
      movementType: 'SALE',
      customerId,
      recordedBy,
      notes,
      referenceId: `sale-${Date.now()}`,
      useExistingWriter,
      existingWriter
    });
  }

  /**
   * Helper: Record stock receipt (purchase)
   */
  static async recordReceipt({
    productId,
    shopId,
    quantityInPurchaseUnits,
    batchNumber,
    expiryDate,
    supplierId,
    recordedBy,
    notes,
    useExistingWriter = false,
    existingWriter = null
  }: {
    productId: string;
    shopId: string;
    quantityInPurchaseUnits: number;
    batchNumber?: string;
    expiryDate?: number;
    supplierId?: string;
    recordedBy?: string;
    notes?: string;
    useExistingWriter?: boolean;
    existingWriter?: any;
  }): Promise<void> {
    const product = await database.get<Product>('products').find(productId);
    
    // Convert purchase units → base units
    const quantityInBase = product.convertPurchaseToBaseUnits(quantityInPurchaseUnits);

    return this.recordMovement({
      productId,
      shopId,
      quantity: quantityInBase,
      movementType: 'IN',
      batchNumber,
      expiryDate,
      supplierId,
      recordedBy,
      notes,
      referenceId: `receipt-${Date.now()}`,
      useExistingWriter,
      existingWriter
    });
  }

  /**
   * ⚠️ Reconciliation: Recompute stock from movements (for debugging/fixing)
   */
  static async recomputeStock(productId: string): Promise<number> {
    const movements = await database.get<StockMovement>('stock_movements')
      .query(Q.where('product_id', productId))
      .fetch();

    let stock = 0;
    for (const m of movements) {
      if (m.movementType === 'IN' || m.movementType === 'TRANSFER_IN') {
        stock += m.quantity;
      } else {
        stock -= m.quantity;
      }
    }
    return Math.max(0, stock);
  }

  /**
   * 🔧 Fix mismatched stock (e.g., after import or sync error)
   */
  static async reconcileProduct(productId: string): Promise<void> {
    const product = await database.get<Product>('products').find(productId);
    const recomputed = await this.recomputeStock(productId);
    const current = product.stockQuantity || 0;

    if (Math.abs(recomputed - current) > 1e-6) { // tolerance for floats
      console.warn(`[Reconcile] Stock mismatch for ${product.name}: DB=${current}, recomputed=${recomputed}`);
      
      await database.write(async () => {
        await product.update(p => {
          p.stockQuantity = recomputed;
        });
      });
    }
  }
}