// app/model/migrations.js
import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [

    {
      toVersion: 2,
      steps:[
        {
          type: 'add_columns',
          table: 'stock_movements',
          columns: [
            { name: 'reference_id', type: 'string', isOptional: true },
          ]
        }
      ]
    },
    // {
    //   toVersion: 2,
    //   steps: [
    //     {
    //       type: 'add_columns',
    //       table: 'products',
    //       columns: [
    //         { name: 'shop_id', type: 'string' },
    //       ],
    //     },
    //   ],
    // },

    // {
    //   toVersion: 3,
    //   steps: [
    //     {
    //       type: 'add_columns',
    //       table: 'products',
    //       columns: [
    //         { name: 'unit_conversion_factor', type: 'number', isOptional: true },
    //         { name: 'image_url', type: 'string', isOptional: true },
    //         { name: 'image_thumbnail_url', type: 'string', isOptional: true },
    //       ],
    //     },
    //   ],
    // },

    // {
    //   toVersion: 4,
    //   steps: [
    //     {
    //       type: 'add_columns',
    //       table: 'products',
    //       columns: [
    //         { name: 'stock_quantity', type: 'number' },
    //       ],
    //     },
    //   ],
    // },

    // {
    //   toVersion: 5,
    //   steps: [
    //     {
    //       type: 'add_columns',
    //       table: 'products',
    //       columns: [
    //         { name: 'selling_unit', type: 'number' },
    //       ],
    //     },
    //   ],
    // },

    // {
    //   toVersion: 6,
    //   steps: [
    //     {
    //       type: 'add_columns',
    //       table: 'stock_movements',
    //       columns: [
    //         { name: 'reference_id', type: 'string', isOptional: true },
    //       ],
    //     },
    //   ],
    // },

    // // 🆕 Block Shop Migration
    // {
    //   toVersion: 7,
    //   steps: [
    //     {
    //       type: 'add_columns',
    //       table: 'shops',
    //       columns: [
    //         { name: 'is_blocked', type: 'boolean', isOptional: true },
    //         { name: 'blocked_reason', type: 'string', isOptional: true },
    //         { name: 'blocked_at', type: 'number', isOptional: true },
    //       ],
    //     },
    //   ],
    // },

    // {
    //   toVersion: 8,
    //   steps: [
    //     // 1. Expense Categories
    //     createTable({
    //       name: 'expense_categories',
    //       columns: [
    //         { name: 'shop_id', type: 'string' },
    //         { name: 'name', type: 'string' },
    //         { name: 'description', type: 'string', isOptional: true },
    //         { name: 'parent_category_id', type: 'string', isOptional: true },
    //         { name: 'is_active', type: 'boolean' },
    //         { name: 'created_at', type: 'number' },
    //         { name: 'updated_at', type: 'number' },
    //         { name: '_tableStatus', type: 'string' },
    //         { name: '_lastSyncChanged', type: 'number' },
    //         { name: 'server_id', type: 'string', isOptional: true },
    //         { name: 'last_sync_at', type: 'number', isOptional: true },
    //       ],
    //     }),

    //     // 2. Transactions
    //     createTable({
    //       name: 'transactions',
    //       columns: [
    //         { name: 'shop_id', type: 'string' },
    //         { name: 'transaction_type', type: 'string' },
    //         { name: 'transaction_number', type: 'string', isIndexed: true },
    //         { name: 'contact_id', type: 'string', isOptional: true },
    //         { name: 'expense_category_id', type: 'string', isOptional: true },
    //         { name: 'subtotal', type: 'number' },
    //         { name: 'tax_amount', type: 'number', isOptional: true },
    //         { name: 'discount_amount', type: 'number', isOptional: true },
    //         { name: 'total_amount', type: 'number' },
    //         { name: 'amount_paid', type: 'number' },
    //         { name: 'balance_due', type: 'number' },
    //         { name: 'payment_status', type: 'string' },
    //         { name: 'transaction_date', type: 'number' },
    //         { name: 'due_date', type: 'number', isOptional: true },
    //         { name: 'is_recurring', type: 'boolean', isOptional: true },
    //         { name: 'recurring_interval', type: 'string', isOptional: true },
    //         { name: 'next_recurring_date', type: 'number', isOptional: true },
    //         { name: 'receipt_image_url', type: 'string', isOptional: true },
    //         { name: 'is_business_expense', type: 'boolean', isOptional: true },
    //         { name: 'notes', type: 'string', isOptional: true },
    //         { name: 'recorded_by', type: 'string' },
    //         { name: 'created_at', type: 'number' },
    //         { name: 'updated_at', type: 'number' },
    //         { name: '_tableStatus', type: 'string' },
    //         { name: '_lastSyncChanged', type: 'number' },
    //         { name: 'server_id', type: 'string', isOptional: true },
    //         { name: 'last_sync_at', type: 'number', isOptional: true },
    //       ],
    //     }),

    //     // 3. Cash Accounts
    //     createTable({
    //       name: 'cash_accounts',
    //       columns: [
    //         { name: 'shop_id', type: 'string' },
    //         { name: 'name', type: 'string' },
    //         { name: 'type', type: 'string' },
    //         { name: 'account_number', type: 'string', isOptional: true },
    //         { name: 'bank_name', type: 'string', isOptional: true },
    //         { name: 'current_balance', type: 'number' },
    //         { name: 'opening_balance', type: 'number' },
    //         { name: 'currency', type: 'string' },
    //         { name: 'is_active', type: 'boolean' },
    //         { name: 'is_default', type: 'boolean' },
    //         { name: 'notes', type: 'string', isOptional: true },
    //         { name: 'created_at', type: 'number' },
    //         { name: 'updated_at', type: 'number' },
    //         { name: '_tableStatus', type: 'string' },
    //         { name: '_lastSyncChanged', type: 'number' },
    //         { name: 'server_id', type: 'string', isOptional: true },
    //         { name: 'last_sync_at', type: 'number', isOptional: true },
    //       ],
    //     }),

    //     // 4. Payments
    //     createTable({
    //       name: 'payments',
    //       columns: [
    //         { name: 'transaction_id', type: 'string', isIndexed: true },
    //         { name: 'shop_id', type: 'string' },
    //         { name: 'payment_method_id', type: 'string' },
    //         { name: 'cash_account_id', type: 'string' },
    //         { name: 'amount', type: 'number' },
    //         { name: 'payment_date', type: 'number' },
    //         { name: 'reference_number', type: 'string', isOptional: true },
    //         { name: 'notes', type: 'string', isOptional: true },
    //         { name: 'recorded_by', type: 'string' },
    //         { name: 'created_at', type: 'number' },
    //         { name: 'updated_at', type: 'number' },
    //         { name: '_tableStatus', type: 'string' },
    //         { name: '_lastSyncChanged', type: 'number' },
    //         { name: 'server_id', type: 'string', isOptional: true },
    //         { name: 'last_sync_at', type: 'number', isOptional: true },
    //       ],
    //     }),

    //     // 5. Account Transactions
    //     createTable({
    //       name: 'account_transactions',
    //       columns: [
    //         { name: 'shop_id', type: 'string' },
    //         { name: 'cash_account_id', type: 'string' },
    //         { name: 'transaction_id', type: 'string', isOptional: true },
    //         { name: 'payment_id', type: 'string', isOptional: true },
    //         { name: 'type', type: 'string' },
    //         { name: 'amount', type: 'number' },
    //         { name: 'balance_before', type: 'number' },
    //         { name: 'balance_after', type: 'number' },
    //         { name: 'description', type: 'string' },
    //         { name: 'category', type: 'string', isOptional: true },
    //         { name: 'reference', type: 'string', isOptional: true },
    //         { name: 'notes', type: 'string', isOptional: true },
    //         { name: 'transaction_date', type: 'number' },
    //         { name: 'recorded_by', type: 'string' },
    //         { name: 'created_at', type: 'number' },
    //         { name: 'updated_at', type: 'number' },
    //         { name: '_tableStatus', type: 'string' },
    //         { name: '_lastSyncChanged', type: 'number' },
    //         { name: 'server_id', type: 'string', isOptional: true },
    //         { name: 'last_sync_at', type: 'number', isOptional: true },
    //       ],
    //     }),
    //   ],
    // }
  ],
})
