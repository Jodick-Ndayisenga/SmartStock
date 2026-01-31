import {  Relation } from '@nozbe/watermelondb';
import { relation, field } from '@nozbe/watermelondb/decorators';
import { BaseModel } from './BaseModel';

export default class ExpenseCategory extends BaseModel {
  static table = 'expense_categories';
  
  static associations = {
    transactions: { type: 'has_many', foreignKey: 'expense_category_id' },
  } as const;

  @field('shop_id') shopId!: string;
  @field('name') name!: string;
  @field('description') description?: string;
  @field('parent_category_id') parentCategoryId?: string;
  @field('is_active') isActive!: boolean;
  @relation('expense_categories', 'parent_category_id') parentCategory?: Relation<ExpenseCategory>;
}