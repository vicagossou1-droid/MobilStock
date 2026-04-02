import { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  User,
  Wrench,
  Banknote,
  Smartphone,
  Plus,
  Minus,
  Trash2,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useStock } from '@/hooks/useStock';
import { useSales } from '@/hooks/useSales';
import { useCompatibilities } from '@/hooks/useCompatibilities';
import { useBoutique } from '@/hooks/useBoutique';
import type { CartItem, ClientType, PaymentMethod, SaleMode } from '@/modules/sales/types';
import { getErrorMessage } from '@/utils/errors';

export default function SalesPage() {
  const { items: stock } = useStock();
  const { createSale } = useSales();
  const { compatibilities } = useCompatibilities();
  const { paymentAccounts } = useBoutique();

  const [clientType, setClientType] = useState<ClientType>('simple');
  const [saleMode, setSaleMode] = useState<SaleMode>('catalogue');
  const [paymentType, setPaymentType] = useState<PaymentMethod>('cash');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [montantLibre, setMontantLibre] = useState('');
  const [nomArticleLibre, setNomArticleLibre] = useState('');
  const [selectedFreeStockId, setSelectedFreeStockId] = useState('');
  const [mobileOperator, setMobileOperator] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const operators = useMemo(
    () => [...new Set(paymentAccounts.map((account) => account.operator).filter(Boolean))],
    [paymentAccounts],
  );

  useEffect(() => {
    if (!mobileOperator && operators.length > 0) {
      setMobileOperator(operators[0]);
      return;
    }

    if (mobileOperator && !operators.includes(mobileOperator) && operators.length > 0) {
      setMobileOperator(operators[0]);
    }
  }, [mobileOperator, operators]);

  const catalogue = stock.map((item) => ({
    id: item.id,
    nom: item.nom,
    modele: item.modele,
    quantite: item.quantite,
    prix: clientType === 'technicien' ? item.prixTechnicien : item.prixClient,
  }));

  const normalizeText = (value: string) => value.trim().toLowerCase();
  const normalizedSearch = search.trim().toLowerCase();

  const filteredCatalogue = catalogue.filter(
    (item) =>
      item.nom.toLowerCase().includes(normalizedSearch) ||
      item.modele.toLowerCase().includes(normalizedSearch),
  );

  const outOfStockCatalogue = filteredCatalogue.filter((item) => item.quantite <= 0);
  const inStockCatalogue = filteredCatalogue.filter((item) => item.quantite > 0);
  const freeSaleOptions = catalogue
    .filter((item) => item.quantite > 0)
    .sort((left, right) => `${left.nom} ${left.modele}`.localeCompare(`${right.nom} ${right.modele}`, 'fr', { sensitivity: 'base' }));
  const selectedFreeStockItem = catalogue.find((item) => item.id === selectedFreeStockId) ?? null;

  const compatMatches = compatibilities.filter(
    (compatibility) =>
      compatibility.piece_name.toLowerCase().includes(normalizedSearch) ||
      compatibility.supported_models.some((model) => model.toLowerCase().includes(normalizedSearch)),
  );

  const outOfStockCompatibilities = compatibilities.filter((compatibility) =>
    outOfStockCatalogue.some(
      (item) =>
        normalizeText(compatibility.piece_name) === normalizeText(item.nom) ||
        compatibility.supported_models.some((model) => normalizeText(model) === normalizeText(item.modele)),
    ),
  );

  const compatibilitySuggestions = Array.from(
    new Set(
      outOfStockCompatibilities.flatMap((compatibility) =>
        compatibility.supported_models.map((model) => model.trim()).filter(Boolean),
      ),
    ),
  );

  const sanitizeIntegerInput = (value: string) => value.replace(/[^0-9]/g, '');

  const addToCart = (item: (typeof catalogue)[number]) => {
    if (item.quantite <= 0) {
      toast.error('Pièce indisponible en stock. Voir les compatibilités ci-dessous.');
      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find((cartItem) => cartItem.id === item.id);

      if (existing) {
        if (existing.quantite >= existing.stockDisponible) {
          toast.error('Impossible de dépasser la quantité disponible en stock.');
          return currentCart;
        }

        return currentCart.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantite: cartItem.quantite + 1 } : cartItem,
        );
      }

      return [
        ...currentCart,
        {
          id: item.id,
          nom: item.nom,
          modele: item.modele,
          prix: item.prix,
          prixCatalogue: item.prix,
          quantite: 1,
          stockDisponible: item.quantite,
        },
      ];
    });
  };

  const updateCartPrice = (id: string, nextValue: string) => {
    const sanitizedValue = sanitizeIntegerInput(nextValue);

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === id
          ? {
              ...item,
              prix: sanitizedValue ? Number(sanitizedValue) : 0,
            }
          : item,
      ),
    );
  };

  const resetCartPrice = (id: string) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === id
          ? {
              ...item,
              prix: item.prixCatalogue,
            }
          : item,
      ),
    );
  };

  const handleFreeStockSelection = (stockItemId: string) => {
    setSelectedFreeStockId(stockItemId);

    if (!stockItemId) {
      return;
    }

    const selectedItem = catalogue.find((item) => item.id === stockItemId);

    if (!selectedItem) {
      return;
    }

    setNomArticleLibre(selectedItem.modele ? `${selectedItem.nom} (${selectedItem.modele})` : selectedItem.nom);
    setMontantLibre(String(selectedItem.prix));
  };

  const updateQty = (id: string, delta: number) => {
    setCart((currentCart) => {
      const cartItem = currentCart.find((item) => item.id === id);
      if (!cartItem) {
        return currentCart;
      }

      const stockItem = stock.find((item) => item.id === id);
      const stockDisponible = stockItem?.quantite ?? cartItem.stockDisponible;
      const nextQuantity = Math.max(1, cartItem.quantite + delta);

      if (nextQuantity > stockDisponible) {
        toast.error('Impossible de dépasser la quantité disponible en stock.');
        return currentCart;
      }

      return currentCart.map((item) =>
        item.id === id ? { ...item, quantite: nextQuantity, stockDisponible } : item,
      );
    });
  };

  const removeFromCart = (id: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + item.prix * item.quantite, 0);
  const finalTotal = saleMode === 'libre' ? Number(montantLibre) || 0 : total;
  const canValidate =
    (saleMode === 'libre'
      ? finalTotal > 0 && nomArticleLibre.trim() !== '' && (!selectedFreeStockItem || selectedFreeStockItem.quantite > 0)
      : cart.length > 0 && finalTotal > 0) &&
    (paymentType === 'cash' || Boolean(mobileOperator));

  const formatPrice = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;

  const handleValidate = async () => {
    setIsSubmitting(true);

    try {
      if (saleMode === 'libre' && selectedFreeStockId && !selectedFreeStockItem) {
        throw new Error('La pièce sélectionnée dans le stock n’est plus disponible.');
      }

      await createSale({
        sale_type: saleMode,
        client_type: clientType,
        items: saleMode === 'catalogue'
          ? cart.map((item) => ({
              stock_item_id: item.id,
              quantity: item.quantite,
              unit_price: item.prix,
            }))
          : selectedFreeStockItem
            ? [
                {
                  stock_item_id: selectedFreeStockItem.id,
                  quantity: 1,
                  unit_price: Number(montantLibre) || 0,
                },
              ]
            : [],
        payment: {
          method: paymentType,
          amount: finalTotal,
          operator: paymentType === 'mobile' ? mobileOperator : undefined,
        },
      });

      toast.success('Vente enregistrée', { description: `Montant : ${formatPrice(finalTotal)}` });
      setCart([]);
      setMontantLibre('');
      setNomArticleLibre('');
      setSelectedFreeStockId('');
      setSearch('');
    } catch (error) {
      toast.error('Erreur lors de l’enregistrement', { description: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Nouvelle vente" description="Créez une vente rapidement" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap gap-3 animate-fade-in-up">
            <div className="flex overflow-hidden rounded-lg border bg-card">
              <button
                onClick={() => setClientType('simple')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all',
                  clientType === 'simple' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <User className="h-4 w-4" /> Client
              </button>
              <button
                onClick={() => setClientType('technicien')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all',
                  clientType === 'technicien' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <Wrench className="h-4 w-4" /> Technicien
              </button>
            </div>
            <div className="flex overflow-hidden rounded-lg border bg-card">
              <button
                onClick={() => setSaleMode('catalogue')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all',
                  saleMode === 'catalogue' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <ShoppingCart className="h-4 w-4" /> Catalogue
              </button>
              <button
                onClick={() => setSaleMode('libre')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all',
                  saleMode === 'libre' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <Banknote className="h-4 w-4" /> Libre
              </button>
            </div>
          </div>

          {saleMode === 'catalogue' && (
            <div className="space-y-3 animate-fade-in-up delay-1">
              <Input
                placeholder="Rechercher une pièce…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="max-w-sm"
              />

              {normalizedSearch && inStockCatalogue.length === 0 && outOfStockCatalogue.length > 0 && (
                <div className="rounded-lg border border-yellow-300/30 bg-yellow-100/20 p-3 text-sm text-yellow-800 dark:border-yellow-500/40 dark:bg-yellow-900/25 dark:text-yellow-100">
                  Pièce trouvée mais en rupture : {outOfStockCatalogue[0]?.nom} ({outOfStockCatalogue[0]?.modele}).
                  <br />Compatibilités enregistrées :
                  {compatibilitySuggestions.length > 0 ? (
                    <span className="font-semibold"> {compatibilitySuggestions.join(', ')}</span>
                  ) : (
                    <span className="font-semibold"> Aucune compatibilité définie.</span>
                  )}
                </div>
              )}

              {normalizedSearch && filteredCatalogue.length === 0 && compatMatches.length > 0 && (
                <div className="rounded-lg border border-cyan-300/30 bg-cyan-100/20 p-3 text-sm text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-900/25 dark:text-cyan-100">
                  Pièce non trouvée dans le stock. Compatibilités associées :
                  <ul className="ml-4 list-inside list-disc">
                    {compatMatches.map((compatibility) => (
                      <li key={compatibility.id}>
                        {compatibility.piece_name} (modèles : {compatibility.supported_models.join(', ')})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredCatalogue.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className={cn(
                      'flex scale-[1] items-center gap-3 rounded-xl border p-4 text-left transition-all duration-150 active:scale-[0.98] hover:shadow-card-hover',
                      item.quantite > 0 && !isSubmitting
                        ? 'border bg-card hover:border-primary'
                        : 'cursor-not-allowed border-muted bg-muted/40 text-muted-foreground',
                    )}
                    disabled={item.quantite <= 0 || isSubmitting}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.nom}</p>
                      <p className="text-xs text-muted-foreground">{item.modele}</p>
                      <p className="text-xs text-muted-foreground">Quantité : {item.quantite}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums">{formatPrice(item.prix)}</p>
                  </button>
                ))}
              </div>

              {normalizedSearch && filteredCatalogue.length === 0 && compatMatches.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune pièce correspondante. Essayez un autre nom ou modèle.</p>
              )}
            </div>
          )}

          {saleMode === 'libre' && (
            <div className="space-y-4 rounded-xl border bg-card p-6 animate-fade-in-up delay-1">
              <div>
                <Label>Pièce du catalogue</Label>
                <select
                  value={selectedFreeStockId}
                  onChange={(event) => handleFreeStockSelection(event.target.value)}
                  className="mt-2 flex h-10 w-full max-w-xl rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Vente libre sans pièce du stock</option>
                  {freeSaleOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nom} {item.modele ? `— ${item.modele}` : ''} · {formatPrice(item.prix)} · Stock {item.quantite}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Nom de l'article *</Label>
                <Input
                  value={nomArticleLibre}
                  onChange={(event) => setNomArticleLibre(event.target.value)}
                  placeholder="Ex: Réparation écran, Accessoire…"
                  className="max-w-sm"
                />
              </div>
              <div>
                <Label>{selectedFreeStockItem ? 'Prix négocié' : 'Montant de la vente'}</Label>
                <Input
                  type="number"
                  step={500}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Saisir le montant…"
                  value={montantLibre}
                  onChange={(event) => setMontantLibre(sanitizeIntegerInput(event.target.value))}
                  onKeyDown={(event) => {
                    if (['e', 'E', '+', '-', '.'].includes(event.key)) {
                      event.preventDefault();
                    }
                  }}
                  className="h-14 max-w-sm text-2xl font-bold"
                />
                {selectedFreeStockItem && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tarif catalogue : {formatPrice(selectedFreeStockItem.prix)}.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 animate-fade-in-up delay-2">
            <h3 className="mb-4 flex items-center gap-2 font-semibold"><ShoppingCart className="h-4 w-4" /> Récapitulatif</h3>
            {saleMode === 'catalogue' && cart.length > 0 && (
              <div className={cn('mb-4 space-y-2', isSubmitting && 'opacity-60')}>
                {cart.map((item) => {
                  const stockDisponible = stock.find((stockItem) => stockItem.id === item.id)?.quantite ?? item.stockDisponible;

                  return (
                    <div key={item.id} className="rounded-lg px-2 py-2 hover:bg-muted/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.nom}</p>
                          <p className="text-xs text-muted-foreground">{item.modele}</p>
                          <div className="mt-2 flex flex-wrap items-end gap-2">
                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Prix unitaire</label>
                              <Input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                step={500}
                                value={item.prix === 0 ? '' : String(item.prix)}
                                onChange={(event) => updateCartPrice(item.id, event.target.value)}
                                onKeyDown={(event) => {
                                  if (['e', 'E', '+', '-', '.'].includes(event.key)) {
                                    event.preventDefault();
                                  }
                                }}
                                className="h-9 w-32"
                                disabled={isSubmitting}
                              />
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => resetCartPrice(item.id)} disabled={isSubmitting || item.prix === item.prixCatalogue}>
                              Tarif standard
                            </Button>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Standard : {formatPrice(item.prixCatalogue)} · Ligne : {formatPrice(item.prix * item.quantite)}
                          </p>
                        </div>
                        <div className="ml-2 flex items-center gap-1.5">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="flex h-6 w-6 items-center justify-center rounded bg-muted transition-colors hover:bg-muted-foreground/20 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isSubmitting}
                            title="Diminuer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold tabular-nums">{item.quantite}</span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className={cn(
                              'flex h-6 w-6 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                              item.quantite >= stockDisponible || isSubmitting
                                ? 'cursor-not-allowed bg-muted text-muted-foreground'
                                : 'bg-muted hover:bg-muted-foreground/20',
                            )}
                            disabled={item.quantite >= stockDisponible || isSubmitting}
                            title="Ajouter"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="ml-1 flex h-6 w-6 items-center justify-center rounded text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isSubmitting}
                            title="Supprimer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {saleMode === 'catalogue' && cart.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Sélectionnez des pièces à vendre</p>
            )}
            {saleMode === 'libre' && nomArticleLibre && (
              <div className="mb-4 px-2 py-2">
                <p className="text-sm font-medium">{nomArticleLibre}</p>
                {selectedFreeStockItem && (
                  <p className="text-xs text-muted-foreground">
                    Pièce du stock sélectionnée · tarif standard {formatPrice(selectedFreeStockItem.prix)}
                  </p>
                )}
              </div>
            )}
            <div className="mt-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="text-xl font-bold tabular-nums">{formatPrice(finalTotal)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 animate-fade-in-up delay-3">
            <h3 className="mb-3 font-semibold">Paiement</h3>
            <div className="mb-3 flex overflow-hidden rounded-lg border">
              <button
                onClick={() => setPaymentType('cash')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all',
                  paymentType === 'cash' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <Banknote className="h-4 w-4" /> Espèces
              </button>
              <button
                onClick={() => setPaymentType('mobile')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all',
                  paymentType === 'mobile' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <Smartphone className="h-4 w-4" /> Mobile
              </button>
            </div>
            {paymentType === 'mobile' && (
              <div className="mb-3 space-y-2 animate-scale-in">
                <label className="text-xs font-medium text-muted-foreground">Opérateur</label>
                {operators.length > 0 ? (
                  <div className="flex gap-2">
                    {operators.map((operator) => (
                      <button
                        key={operator}
                        onClick={() => setMobileOperator(operator)}
                        className={cn(
                          'flex-1 rounded-lg border py-2 text-sm font-medium transition-all',
                          mobileOperator === operator
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'hover:bg-muted',
                        )}
                      >
                        {operator}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Ajoutez un compte mobile dans les paramètres pour utiliser ce mode de paiement.</p>
                )}
              </div>
            )}
            <Button className="mt-2 w-full" size="lg" disabled={!canValidate || isSubmitting} onClick={handleValidate}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validation en cours...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" /> Valider la vente
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
