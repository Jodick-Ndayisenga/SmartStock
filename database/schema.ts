// database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

// Common sync columns to add to ALL tables
const syncColumns = [
  { name: '_tableStatus', type: 'string' as const },
  { name: '_lastSyncChanged', type: 'number' as const },
  { name: 'server_id', type: 'string' as const, isOptional: true },
  { name: 'last_sync_at', type: 'number' as const, isOptional: true },
];

export default appSchema({
  version: 2,
  tables: [
    // ─── SHOP ───────────────────────────────────────
    tableSchema({
      name: 'shops',
      columns: [
        { name: 'name', type: 'string' as const },
        { name: "shopId", type: 'string' as const, isIndexed: true},
        { name: 'owner_id', type: 'string' as const },
        { name: 'location', type: 'string' as const, isOptional: true },
        { name: 'phone', type: 'string' as const, isOptional: true },
        { name: 'created_at', type: 'number' as const },
        { name: 'updated_at', type: 'number' as const },
        { name: 'branch_code', type: 'string' as const, isOptional: true },
        { name: 'is_blocked', type: 'boolean' as const, isOptional: true },
        { name: 'blocked_reason', type: 'string' as const, isOptional: true },
        { name: 'blocked_at', type: 'number' as const, isOptional: true },

        ...syncColumns,
      ],
    }),

    // ─── PRODUCT ────────────────────────────────────
    tableSchema({
      name: 'products',
      columns: [
        // Core
        { name: 'name', type: 'string' as const },
        { name: 'sku', type: 'string' as const, isOptional: true },
        { name: 'barcode', type: 'string' as const, isOptional: true },
        { name: 'category', type: 'string' as const, isOptional: true },
        { name: 'description', type: 'string' as const, isOptional: true },

        // Unit system
        { name: 'unit_type', type: 'string' as const },
        { name: 'is_weighted', type: 'boolean' as const },
        { name: 'base_unit', type: 'string' as const },
        { name: 'purchase_unit', type: 'string' as const, isOptional: true },
        { name: 'purchase_unit_size', type: 'number' as const, isOptional: true },

        // Pricing (per base unit)
        { name: 'cost_price_per_base', type: 'number' as const },
        { name: 'selling_price_per_base', type: 'number' as const },
        { name: 'wholesale_price_per_base', type: 'number' as const, isOptional: true },
        { name: 'selling_unit', type: 'string' as const, isOptional: true },
        { name: "unit_conversion_factor", type: 'number' as const, isOptional: true},

        // Inventory control
        { name: 'low_stock_threshold', type: 'number' as const, isOptional: true },
        { name: 'is_active', type: 'boolean' as const },
        { name: 'is_perishable', type: 'boolean' as const },
        { name: 'default_expiry_days', type: 'number' as const, isOptional: true },

        // ADD THIS LINE - Foreign key to shop
        { name: 'shop_id', type: 'string' as const }, // ← ADD THIS

        { name: 'image_url', type: 'string' as const, isOptional: true },
        { name: 'image_thumbnail_url', type: 'string' as const, isOptional: true },
        // In products table
        { name: 'stock_quantity', type: 'number' as const },


        // Metadata
        { name: 'created_at', type: 'number' as const },
        { name: 'updated_at', type: 'number' as const },
        ...syncColumns,
      ],
    }),

    // ─── STOCK MOVEMENT ─────────────────────────────
    tableSchema({
      name: 'stock_movements',
      columns: [
        { name: 'product_id', type: 'string' as const },
        { name: 'shop_id', type: 'string' as const },
        { name: 'quantity', type: 'number' as const },
        { name: 'movement_type', type: 'string' as const },
        { name: 'batch_number', type: 'string' as const, isOptional: true },
        { name: 'expiry_date', type: 'number' as const, isOptional: true },
        { name: 'supplier_id', type: 'string' as const, isOptional: true },
        { name: 'customer_id', type: 'string' as const, isOptional: true },
        { name: 'notes', type: 'string' as const, isOptional: true },
        { name: 'recorded_by', type: 'string' as const, isOptional: true },
        { name: 'reference_id', type: 'string' as const, isOptional: true },
        { name: 'timestamp', type: 'number' as const },
        { name: 'created_at', type: 'number' as const },
        { name: 'updated_at', type: 'number' as const },
        ...syncColumns,
      ],
    }),

    // ─── CONTACTS ───────────────────────────────────
    tableSchema({
      name: 'contacts',
      columns: [
        { name: 'shop_id', type: 'string' as const },
        { name: 'name', type: 'string' as const },
        { name: 'phone', type: 'string' as const },
        { name: 'role', type: 'string' as const },
        { name: 'email', type: 'string' as const, isOptional: true },
        { name: 'address', type: 'string' as const, isOptional: true },
        { name: 'is_default_alert_contact', type: 'boolean' as const },
        { name: 'created_at', type: 'number' as const },
        { name: 'updated_at', type: 'number' as const },
        ...syncColumns,
      ],
    }),

    // ─── SETTINGS ───────────────────────────────────
    tableSchema({
      name: 'settings',
      columns: [
        { name: 'shop_id', type: 'string' as const },
        { name: 'language', type: 'string' as const },
        { name: 'backup_enabled', type: 'boolean' as const },
        { name: 'sms_alerts_enabled', type: 'boolean' as const },
        { name: 'auto_backup_wifi_only', type: 'boolean' as const },
        { name: 'week_start_day', type: 'number' as const },
        { name: 'currency', type: 'string' as const },
        { name: 'updated_at', type: 'number' as const },
        { name: 'created_at', type: 'number' as const },
        ...syncColumns,
      ],
    }),

    // ─── USERS ──────────────────────────────────────
    tableSchema({
      name: 'users',
      columns: [
        { name: 'firebase_uid', type: 'string' as const, isIndexed: true },
        { name: 'display_name', type: 'string' as const, isOptional: true },
        { name: 'email', type: 'string' as const, isIndexed: true },
        { name: 'phone', type: 'string' as const, isOptional: true },
        { name:"password", type:"string" as const, isOptional: true},
        { name: 'is_owner', type: 'boolean' as const },
        { name: 'created_at', type: 'number' as const },
        { name: 'updated_at', type: 'number' as const },
        ...syncColumns,
      ],
    }),

    // ─── MEMBERSHIPS ────────────────────────────────
    tableSchema({
      name: 'memberships',
      columns: [
        { name: 'user_id', type: 'string' as const, isIndexed: true },
        { name: 'shop_id', type: 'string' as const, isIndexed: true },
        { name: 'role', type: 'string' as const },
        { name: 'status', type: 'string' as const },
        { name: 'joined_at', type: 'number' as const },
        { name: 'invited_by', type: 'string' as const, isOptional: true },
        { name: 'created_at', type: 'number' as const },
        { name: 'updated_at', type: 'number' as const },
        ...syncColumns,
      ],
    }),

    // ─── EXPENSE CATEGORIES ──────────────────────────
    tableSchema({
      name: 'expense_categories',
      columns: [
        { name: 'shop_id', type: 'string' as const },
        { name: 'name', type: 'string' as const },
        { name: 'description', type: 'string' as const, isOptional: true },
        { name: 'parent_category_id', type: 'string' as const, isOptional: true }, // For nested categories
        { name: 'is_active', type: 'boolean' as const },
        { name: 'created_at', type: 'number' as const },
        { name: 'updated_at', type: 'number' as const },
        ...syncColumns,
      ],
    }),

    // ─── TRANSACTIONS ─────────────────────────────────
    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'shop_id', type: 'string' as const },
        { name: 'transaction_type', type: 'string' as const }, // 'sale', 'purchase', 'expense', 'income', 'transfer'
        { name: 'transaction_number', type: 'string' as const, isIndexed: true },
        { name: 'contact_id', type: 'string' as const, isOptional: true },
        { name: 'expense_category_id', type: 'string' as const, isOptional: true }, // ← NEW: For categorizing expenses
        { name: 'subtotal', type: 'number' as const },
        { name: 'tax_amount', type: 'number' as const, isOptional: true },
        { name: 'discount_amount', type: 'number' as const, isOptional: true },
        { name: 'total_amount', type: 'number' as const },
        { name: 'amount_paid', type: 'number' as const },
        { name: 'balance_due', type: 'number' as const },
        { name: 'payment_status', type: 'string' as const },
        { name: 'transaction_date', type: 'number' as const },
        { name: 'due_date', type: 'number' as const, isOptional: true },
        { name: 'is_recurring', type: 'boolean' as const, isOptional: true }, // ← NEW: For recurring expenses
        { name: 'recurring_interval', type: 'string' as const, isOptional: true }, // daily, weekly, monthly, yearly
        { name: 'next_recurring_date', type: 'number' as const, isOptional: true },
        { name: 'receipt_image_url', type: 'string' as const, isOptional: true }, // ← NEW: Store receipt photos
        { name: 'is_business_expense', type: 'boolean' as const, isOptional: true }, // ← NEW: For tax purposes
        { name: 'notes', type: 'string' as const, isOptional: true },
        { name: 'recorded_by', type: 'string' as const },
        { name: 'created_at', type: 'number' as const },
        { name: 'updated_at', type: 'number' as const },
        ...syncColumns,
      ],
    }),

    // ─── CASH ACCOUNTS ──────────────────────────────
    tableSchema({
      name: 'cash_accounts',
      columns: [
        { name: 'shop_id', type: 'string' as const },
        { name: 'name', type: 'string' as const },
        { name: 'type', type: 'string' as const }, // 'cash', 'bank_account', 'mobile_money', 'credit_card', 'petty_cash'
        { name: 'account_number', type: 'string' as const, isOptional: true },
        { name: 'bank_name', type: 'string' as const, isOptional: true },
        { name: 'current_balance', type: 'number' as const },
        { name: 'opening_balance', type: 'number' as const },
        { name: 'currency', type: 'string' as const },
        { name: 'is_active', type: 'boolean' as const },
        { name: 'is_default', type: 'boolean' as const }, // Default account for shop operations
        { name: 'notes', type: 'string' as const, isOptional: true },
        { name: 'created_at', type: 'number' as const },
        { name: 'updated_at', type: 'number' as const },
        ...syncColumns,
      ],
    }),

    // ─── PAYMENTS ─────────────────────────────────────
    tableSchema({
      name: 'payments',
      columns: [
        { name: 'transaction_id', type: 'string' as const, isIndexed: true },
        { name: 'shop_id', type: 'string' as const },
        { name: 'payment_method_id', type: 'string' as const },
        { name: 'cash_account_id', type: 'string' as const }, // ← NEW: Track which account
        { name: 'amount', type: 'number' as const },
        { name: 'payment_date', type: 'number' as const },
        { name: 'reference_number', type: 'string' as const, isOptional: true },
        { name: 'notes', type: 'string' as const, isOptional: true },
        { name: 'recorded_by', type: 'string' as const },
        { name: 'created_at', type: 'number' as const },
        { name: 'updated_at', type: 'number' as const },
        ...syncColumns,
      ],
    }),

    // ─── ACCOUNT TRANSACTIONS ────────────────────────
    tableSchema({
      name: 'account_transactions',
      columns: [
        { name: 'shop_id', type: 'string' as const },
        { name: 'cash_account_id', type: 'string' as const },
        { name: 'transaction_id', type: 'string' as const, isOptional: true }, // Links to main transaction
        { name: 'payment_id', type: 'string' as const, isOptional: true }, // Links to payment
        { name: 'type', type: 'string' as const }, // 'deposit', 'withdrawal', 'transfer_in', 'transfer_out'
        { name: 'amount', type: 'number' as const },
        { name: 'balance_before', type: 'number' as const },
        { name: 'balance_after', type: 'number' as const },
        { name: 'description', type: 'string' as const },
        { name: 'category', type: 'string' as const, isOptional: true }, // For direct deposits/withdrawals
        { name: 'reference', type: 'string' as const, isOptional: true },
        { name: 'notes', type: 'string' as const, isOptional: true },
        { name: 'transaction_date', type: 'number' as const },
        { name: 'recorded_by', type: 'string' as const },
        { name: 'created_at', type: 'number' as const },
        { name: 'updated_at', type: 'number' as const },
        ...syncColumns,
      ],
    }),


  ],
});