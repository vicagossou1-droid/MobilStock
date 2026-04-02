import { useMemo } from 'react';
import { useSales } from '@/modules/sales/hooks/useSales';
import { useStock } from '@/modules/stock/hooks/useStock';

export function useDashboard() {
  const { sales } = useSales();
  const { items } = useStock();

  const recentSales = useMemo(() => {
    const threshold = Date.now() - 30 * 86400000;
    return sales.filter((sale) => new Date(sale.sale_date).getTime() >= threshold).slice(0, 20);
  }, [sales]);

  const lowStockItems = useMemo(() => items.filter((item) => item.quantite <= 5), [items]);

  return { recentSales, lowStockItems };
}
