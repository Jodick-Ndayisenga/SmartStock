// database/models/StockMovement.ts
import { text, field } from '@nozbe/watermelondb/decorators';
import { BaseModel } from './BaseModel';

export type MovementType = 
  | 'IN'              // Purchase, transfer-in, adjustment (+)
  | 'SALE'            // Customer sale (-)
  | 'ADJUSTMENT'      // Manual correction (±)
  | 'TRANSFER_OUT'    // To another shop/warehouse (-)
  | 'TRANSFER_IN';    // From another shop/warehouse (+)

export class StockMovement extends BaseModel {
  static table = 'stock_movements';

  @text('product_id') productId!: string;
  @text('shop_id') shopId!: string;
  
  @field('quantity') quantity!: number;
  @text('movement_type') movementType!: MovementType;

  // Batch & inventory control
  @text('batch_number') batchNumber?: string;
  @field('expiry_date') expiryDate?: number; // timestamp (ms)

  // Traceability
  @text('supplier_id') supplierId?: string;
  @text('customer_id') customerId?: string;
  @text('reference_id') referenceId?: string; // e.g., sale_id, purchase_order_id
  
  // Context
  @text('notes') notes?: string;
  @text('recorded_by') recordedBy?: string;
  @field('timestamp') timestamp!: number;
}