import { supabase } from '@/lib/supabase';
import type { CreateSaleInput, SaleRecord } from '@/modules/sales/types';
import { getErrorMessage, logDevError } from '@/utils/errors';

export async function fetchSales(boutiqueId: string): Promise<SaleRecord[]> {
  const { data, error } = await supabase
    .from('sales')
    .select(`*, vendor:profiles(full_name), items:sale_items(*, stock_item:stock_items(name, brand, model)), payments:sale_payments(*)`)
    .eq('boutique_id', boutiqueId)
    .is('deleted_at', null)
    .order('sale_date', { ascending: false });

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de charger les ventes.'));
  }

  return (data ?? []) as SaleRecord[];
}

export async function createSale(boutiqueId: string, vendorId: string, input: CreateSaleInput): Promise<string> {
  const computedTotal =
    input.sale_type === 'catalogue'
      ? input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
      : input.payment.amount;

  if (computedTotal <= 0) {
    throw new Error('Le montant total de la vente doit être supérieur à zéro.');
  }

  if (input.sale_type === 'catalogue' && input.items.length === 0) {
    throw new Error('Ajoutez au moins une pièce avant de valider la vente.');
  }

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      boutique_id: boutiqueId,
      vendor_id: vendorId,
      sale_type: input.sale_type,
      client_type: input.client_type,
      total_amount: computedTotal,
      sale_date: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (saleError || !sale) {
    throw new Error(getErrorMessage(saleError, 'Impossible d’enregistrer l’en-tête de vente.'));
  }

  try {
    if (input.items.length > 0) {
      const { error: itemsError } = await supabase.from('sale_items').insert(
        input.items.map((item) => ({
          sale_id: sale.id,
          stock_item_id: item.stock_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      );

      if (itemsError) {
        throw new Error(getErrorMessage(itemsError, 'Impossible d’enregistrer les lignes de vente.'));
      }
    }

    const { error: paymentError } = await supabase.from('sale_payments').insert({
      sale_id: sale.id,
      payment_method: input.payment.method,
      amount: computedTotal,
      operator: input.payment.operator,
      reference_number: input.payment.reference_number,
    });

    if (paymentError) {
      throw new Error(getErrorMessage(paymentError, 'Impossible d’enregistrer le paiement.'));
    }

    return sale.id;
  } catch (error) {
    const { error: rollbackError } = await supabase.from('sales').delete().eq('id', sale.id);

    if (rollbackError) {
      logDevError('sales.rollback', rollbackError);
    }

    throw error;
  }
}
