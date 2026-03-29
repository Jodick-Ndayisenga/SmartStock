import { Q } from '@nozbe/watermelondb';
import { StockMovement } from '@/database/models/StockMovement';
import { useEffect, useState } from 'react';
import database from '@/database';

export const useProductMovementInfo = (productId?: string) => {
  const [hasMovement, setHasMovement] = useState(false);
  const [movementCount, setMovementCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      setHasMovement(false);
      setMovementCount(0);
      setLoading(false);
      return;
    }

    const movementCollection = database.get<StockMovement>('stock_movements');

    const movement$ = movementCollection
      .query(Q.where('product_id', productId))
      .observeCount();

    const subscription = movement$.subscribe(count => {
      setMovementCount(count);
      setHasMovement(count > 0);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [productId]);

  return {
    hasMovement,
    movementCount,
    loading,
  };
};