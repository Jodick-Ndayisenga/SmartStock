import { Platform } from 'react-native'
import schema from './schema'
import migrations from './migrations'
import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { User } from './models/User'
import { Membership } from './models/Membership'
import { Shop } from './models/Shop'
import { Product } from './models/Product'
import { Setting } from './models/Setting'
import { Contact } from './models/Contact'
import { StockMovement } from './models/StockMovement'
import { AccountTransaction } from './models/AccountTransaction'
import { CashAccount } from './models/CashAccount'
import ExpenseCategory from './models/ExpenseCategory'
import { Payment } from './models/Payment'
import Transaction from './models/Transaction'
// import Post from './model/Post' // ⬅️ You'll import your Models here

// First, create the adapter to the underlying database:
const adapter = new SQLiteAdapter({
  schema,
  // (You might want to comment it out for development purposes -- see Migrations documentation)
  migrations,
  // (optional database name or file system path)
   dbName: 'magasin',
  // (recommended option, should work flawlessly out of the box on iOS. On Android,
  // additional installation steps have to be taken - disable if you run into issues...)
  jsi: true, /* Platform.OS === 'ios' */
  // (optional, but you should implement this method)
  onSetUpError: error => {
    // Database failed to load -- offer the user to reload the app or log out
    console.error('Database set up error:', error);
    throw new Error('Database set up error');
  }
})

// Then, make a Watermelon database from it!
const database = new Database({
  adapter,
  modelClasses: [
    User,
    Membership,
    Shop,
    Product,
    Setting,
    Contact,
    StockMovement,
    AccountTransaction,
    CashAccount,
    ExpenseCategory,
    Payment,
    Transaction
  ],
})



export default database