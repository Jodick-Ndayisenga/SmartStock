// utils/dbSeeds.ts
import database from '@/database';
import { defaultProducts } from '@/constants/Products';
import { Product, UnitType } from '@/database/models/Product';
const CHUNK_SIZE = 10;

type ProgressCallback = (done: number, total: number, lastName?: string) => void;

export async function seedShopProducts(
  shopId: string,
  onProgress?: ProgressCallback
): Promise<{ seededCount: number; skipped: boolean; message?: string }> {
  

  const allProducts = Array.isArray(defaultProducts) ? defaultProducts : [];
  if (allProducts.length === 0) {
    return { seededCount: 0, skipped: true, message: 'No seed data found' };
  }

  //onProgress?.(i + chunk.length, allProducts.length, chunk[chunk.length - 1]?.name ?? '');


    for (let i = 0; i < allProducts.length; i += CHUNK_SIZE) {
    const chunk = allProducts.slice(i, i + CHUNK_SIZE);
    await insertMultipleProducts(chunk, shopId);
    onProgress?.(i + chunk.length, allProducts.length, chunk[chunk.length - 1]?.name ?? '');
    await new Promise(r => setTimeout(r, 50)); // optional
  }


  return { seededCount: allProducts.length, skipped: false, message: '✅ Seed complete' };
}


async function insertMultipleProducts(productsData: any[], shopId: string) {
  if (!productsData?.length) return;

  const productCollection = database.get<Product>('products');

  await database.write(async () => {
    for (const productData of productsData) {
      await productCollection.create(product => {
        product.name = productData.name;
        product.sku = productData.sku ?? '';
        product.category = productData.category ?? 'Uncategorized';
        product.unitType = (productData.unitType as UnitType) ?? 'piece';
        product.isWeighted = productData.isWeighted ?? false;
        product.baseUnit = productData.baseUnit ?? 'piece';
        product.purchaseUnit = productData.purchaseUnit ?? 'piece';
        product.sellingUnit = productData.sellingUnit ?? 'piece';
        product.purchaseUnitSize = productData.purchaseUnitSize ?? 1;
        product.unitConversionFactor = productData.unitConversionFactor ?? 1;
        product.costPricePerBase = 0;
        product.sellingPricePerBase = 0;
        product.shopId = shopId;
        product.isActive = false;
      });
    }
  });
}
