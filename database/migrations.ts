// app/model/migrations.js
import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        {
          type: 'add_columns',
          table: 'users',
          columns: [
            { name: 'photo_url', type: 'string', isOptional: true },
          ],
        },
      ],
    },
    {
      toVersion: 3,
      steps: [
        {
          type: 'add_columns',
          table: 'products',
          columns: [
            { name: 'last_notified_at', type: 'number', isOptional: true },
          ],
        },
      ],
    }

  ],
})
