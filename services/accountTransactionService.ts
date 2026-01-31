// services/accountTransactionService.ts
import database from '@/database';
import { AccountTransaction } from '@/database/models/AccountTransaction';
import { Q } from '@nozbe/watermelondb';

const accountTransactions = database.get<AccountTransaction>('account_transactions');

export async function getAccountTransactionsByAccount(cashAccountId: string, limit = 50) {
  return accountTransactions.query(
    Q.sortBy('transaction_date', Q.desc),
    Q.take(limit)
  ).fetch();
}

export async function getAccountTransactionsByShop(shopId: string, limit = 100) {
  return accountTransactions.query(
    Q.where('shop_id', shopId),
    Q.sortBy('transaction_date', Q.desc),
    Q.take(limit)
  ).fetch();
}