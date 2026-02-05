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

    {
      toVersion: 3,
      steps:[
        {
          type: 'add_columns',
          table: 'transactions',
          columns: [
            { name: 'source_account_id', type: 'string', isOptional: true }, // For transfers
            { name: 'destination_account_id', type: 'string', isOptional: true }, // For transfers
          ]
        }
      ]
    }
    
  ],
})
