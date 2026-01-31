// services/cashAccountService.ts
import database from '@/database';
import { CashAccount } from '@/database/models/CashAccount';
import { Q } from '@nozbe/watermelondb';

const cashAccounts = database.get<CashAccount>('cash_accounts');

export type CashAccountData = {
  shopId: string;
  name: string;
  type: 'cash' | 'bank_account' | 'mobile_money' | 'credit_card' | 'petty_cash';
  accountNumber?: string;
  bankName?: string;
  openingBalance: number;
  currency: string;
  notes?: string;
  isDefault?: boolean;
  isActive?: boolean;
};

export async function createCashAccount(data: CashAccountData) {
  return database.write(async () => {
    // If marking as default, unset others
    if (data.isDefault) {
      const existingDefaults = await cashAccounts.query(
        Q.where('shop_id', data.shopId),
        Q.where('is_default', true)
      ).fetch();
      await Promise.all(
        existingDefaults.map(acc =>
          acc.update(a => {
            a.isDefault = false;
            a._tableStatus = 'updated';
          })
        )
      );
    }

    const account = await cashAccounts.create(a => {
      a.shopId = data.shopId;
      a.name = data.name;
      a.type = data.type;
      a.accountNumber = data.accountNumber;
      a.bankName = data.bankName;
      a.openingBalance = data.openingBalance;
      a.currentBalance = data.openingBalance; // start with opening
      a.currency = data.currency;
      a.notes = data.notes;
      a.isActive = true;
      a.isDefault = data.isDefault ?? false;
    });

    return account;
  });
}

export async function updateCashAccount(id: string, updates: Partial<CashAccountData>) {
  return database.write(async () => {
    const account = await cashAccounts.find(id);
    await account.update(a => {
      if (updates.name !== undefined) a.name = updates.name;
      if (updates.type !== undefined) a.type = updates.type;
      if (updates.accountNumber !== undefined) a.accountNumber = updates.accountNumber;
      if (updates.bankName !== undefined) a.bankName = updates.bankName;
      if (updates.currency !== undefined) a.currency = updates.currency;
      if (updates.notes !== undefined) a.notes = updates.notes;
      if (updates.isActive !== undefined) a.isActive = updates.isActive;

      if (updates.isDefault) {
        // Unset other defaults in same shop
        cashAccounts.query(
          Q.where('shop_id', account.shopId),
          Q.where('is_default', true),
          Q.where('id', Q.notEq(id))
        ).fetch().then(defaults => {
          defaults.forEach(d => d.update(x => x.isDefault = false));
        });
        a.isDefault = true;
      }
      a._tableStatus = 'updated';
      a._lastSyncChanged = Date.now();
    });
    return account;
  });
}

export async function getCashAccountsByShop(shopId: string) {
  return cashAccounts.query(Q.where('shop_id', shopId)).fetch();
}

export async function getDefaultCashAccount(shopId: string) {
  const accounts = await cashAccounts.query(
    Q.where('shop_id', shopId),
    Q.where('is_default', true)
  ).fetch();
  return accounts[0] || null;
}