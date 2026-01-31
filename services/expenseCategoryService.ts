// services/expenseCategoryService.ts
import database from '@/database';
import ExpenseCategory from '@/database/models/ExpenseCategory';
import { Q } from '@nozbe/watermelondb';

const expenseCategories = database.get<ExpenseCategory>('expense_categories');

export type ExpenseCategoryData = {
  shopId: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  isActive?: boolean;
};

export async function createExpenseCategory(data: ExpenseCategoryData) {
  return database.write(async () => {
    const category = await expenseCategories.create(c => {
      c.shopId = data.shopId;
      c.name = data.name;
      c.description = data.description;
      c.parentCategoryId = data.parentCategoryId;
      c.isActive = data.isActive ?? true;
    });
    return category;
  });
}

export async function updateExpenseCategory(id: string, updates: Partial<ExpenseCategoryData>) {
  return database.write(async () => {
    const category = await expenseCategories.find(id);
    await category.update(c => {
      if (updates.name !== undefined) c.name = updates.name;
      if (updates.description !== undefined) c.description = updates.description;
      if (updates.parentCategoryId !== undefined) c.parentCategoryId = updates.parentCategoryId;
      if (updates.isActive !== undefined) c.isActive = updates.isActive;
      c._tableStatus = 'updated';
      c._lastSyncChanged = Date.now();
    });
    return category;
  });
}

export async function deleteExpenseCategory(id: string) {
  return database.write(async () => {
    const category = await expenseCategories.find(id);
    await category.markAsDeleted();
    return category;
  });
}

export async function getExpenseCategoriesByShop(shopId: string) {
  return expenseCategories.query(
    Q.where('shop_id', shopId),
    Q.where('is_active', true)
  ).fetch();
}