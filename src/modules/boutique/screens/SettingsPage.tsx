import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Store, CreditCard, Plus, Save, Trash2, Sun, Moon, Monitor, X } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBoutique } from '@/hooks/useBoutique';
import { useAuth } from '@/hooks/useAuth';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/errors';

export default function SettingsPage() {
  const { boutique, paymentAccounts, updateBoutique, addPaymentAccount, deletePaymentAccount } = useBoutique();
  const { refreshBoutiques } = useAuth();
  const { canManageSettings } = useAccessControl();
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  const [localBoutique, setLocalBoutique] = useState(boutique);
  const [logoError, setLogoError] = useState('');
  const [addCompteOpen, setAddCompteOpen] = useState(false);
  const [newCompte, setNewCompte] = useState({ operateur: '', customOperateur: '', numero: '', type: 'Personnel' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalBoutique(boutique);
  }, [boutique]);

  const STANDARD_OPERATORS = ['Mixx', 'Flooz'];
  const MAX_CUSTOM_OPERATORS = 3;

  const customOperators = paymentAccounts
    .filter((account) => !STANDARD_OPERATORS.includes(account.operator))
    .map((account) => account.operator);

  const canAddMore = customOperators.length < MAX_CUSTOM_OPERATORS;
  const resolvedOperator =
    newCompte.operateur === '__custom__' ? newCompte.customOperateur.trim() : newCompte.operateur.trim();

  const handleSaveBoutique = async () => {
    if (!localBoutique) {
      return;
    }

    try {
      const updated = await updateBoutique({
        name: localBoutique.name,
        address: localBoutique.address,
        phone: localBoutique.phone,
        email: localBoutique.email,
        stock_threshold: localBoutique.stock_threshold,
        logo_url: localBoutique.logo_url,
      });

      setLocalBoutique(updated);
      await refreshBoutiques();
      toast.success('Paramètres sauvegardés');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde', { description: getErrorMessage(error) });
    }
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setLogoError('Veuillez sélectionner une image valide (PNG/JPG/GIF)');
      return;
    }

    if (file.size > 200000) {
      setLogoError('Taille maximale : 200 KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      setLocalBoutique((currentBoutique) =>
        currentBoutique
          ? { ...currentBoutique, logo_url: (readerEvent.target?.result as string) || '' }
          : currentBoutique,
      );
      setLogoError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLocalBoutique((currentBoutique) => (currentBoutique ? { ...currentBoutique, logo_url: '' } : currentBoutique));
    setLogoError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddCompte = async () => {
    if (!resolvedOperator || !newCompte.numero.trim()) {
      return;
    }

    if (!STANDARD_OPERATORS.includes(resolvedOperator) && !canAddMore) {
      toast.error(`Nombre maximum de ${MAX_CUSTOM_OPERATORS} opérateurs personnalisés atteint`);
      return;
    }

    if (!STANDARD_OPERATORS.includes(resolvedOperator) && customOperators.includes(resolvedOperator)) {
      toast.error(`L'opérateur ${resolvedOperator} existe déjà`);
      return;
    }

    if (!canManageSettings) {
      toast.error('Seul le propriétaire peut ajouter des comptes de paiement');
      return;
    }

    try {
      await addPaymentAccount({
        operator: resolvedOperator,
        account_number: newCompte.numero.trim(),
        account_type: newCompte.type,
        account_holder_name: localBoutique?.name ?? undefined,
      });

      setNewCompte({ operateur: '', customOperateur: '', numero: '', type: 'Personnel' });
      setAddCompteOpen(false);
      toast.success(`Compte ${resolvedOperator} ajouté`);
    } catch (error) {
      toast.error('Erreur lors de l’ajout du compte', { description: getErrorMessage(error) });
    }
  };

  const handleDeleteCompte = async (accountId: string, operator: string) => {
    try {
      await deletePaymentAccount(accountId);
      toast.success(`Compte ${operator} supprimé`);
    } catch (error) {
      toast.error('Erreur lors de la suppression', { description: getErrorMessage(error) });
    }
  };

  const themes = [
    { value: 'light' as const, label: 'Clair', icon: Sun },
    { value: 'dark' as const, label: 'Sombre', icon: Moon },
    { value: 'system' as const, label: 'Système', icon: Monitor },
  ];

  return (
    <div>
      <PageHeader title="Paramètres" description="Configuration de votre boutique" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 animate-fade-in-up">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Store className="h-4 w-4 text-primary" /> Informations boutique</h3>
          <div className="grid gap-4">
            <div>
              <Label>Logo de la boutique</Label>
              <div className="mt-1 flex items-center gap-3">
                {localBoutique?.logo_url ? (
                  <div className="relative h-14 w-14 overflow-hidden rounded-md border border-input">
                    <img src={localBoutique.logo_url} alt="Logo boutique" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      aria-label="Supprimer le logo de la boutique"
                      className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-white hover:bg-destructive/90"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">Logo</div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    aria-label="Choisir un fichier de logo"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    {localBoutique?.logo_url ? 'Changer' : 'Uploader'} le logo
                  </Button>
                  {logoError && <p className="mt-1 text-xs text-destructive">{logoError}</p>}
                </div>
              </div>
            </div>
            <div>
              <Label>Nom de la boutique</Label>
              <Input value={localBoutique?.name || ''} onChange={(event) => setLocalBoutique((currentBoutique) => currentBoutique ? { ...currentBoutique, name: event.target.value } : currentBoutique)} />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={localBoutique?.address || ''} onChange={(event) => setLocalBoutique((currentBoutique) => currentBoutique ? { ...currentBoutique, address: event.target.value } : currentBoutique)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={localBoutique?.phone || ''} onChange={(event) => setLocalBoutique((currentBoutique) => currentBoutique ? { ...currentBoutique, phone: event.target.value } : currentBoutique)} /></div>
              <div><Label>Email</Label><Input type="email" value={localBoutique?.email || ''} onChange={(event) => setLocalBoutique((currentBoutique) => currentBoutique ? { ...currentBoutique, email: event.target.value } : currentBoutique)} /></div>
            </div>
            <div>
              <Label>Seuil alerte stock</Label>
              <Input
                type="number"
                min={0}
                value={localBoutique?.stock_threshold || 5}
                onChange={(event) => setLocalBoutique((currentBoutique) => currentBoutique ? { ...currentBoutique, stock_threshold: Number(event.target.value) } : currentBoutique)}
                disabled={!canManageSettings}
              />
              {!canManageSettings && <p className="mt-1 text-xs text-muted-foreground">Seul le propriétaire peut modifier ce seuil.</p>}
            </div>
            <Button onClick={handleSaveBoutique} disabled={!canManageSettings || !localBoutique}><Save className="mr-2 h-4 w-4" /> Sauvegarder</Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 animate-fade-in-up delay-1">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4 text-primary" /> Comptes de paiement mobile</h3>
          <p className="mb-4 text-xs text-muted-foreground">Opérateurs autorisés : Mixx, Flooz + jusqu'à {MAX_CUSTOM_OPERATORS} personnalisés ({customOperators.length}/{MAX_CUSTOM_OPERATORS})</p>
          <div className="mb-4 space-y-3">
            {paymentAccounts.map((account) => {
              const isStandard = STANDARD_OPERATORS.includes(account.operator);
              return (
                <div
                  key={account.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-4 py-3',
                    isStandard
                      ? 'border border-blue-100 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100'
                      : 'bg-muted/50',
                  )}
                >
                  <div>
                    <p className="text-sm font-medium">{account.operator}</p>
                    <p className="font-mono text-xs text-muted-foreground">{account.account_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{account.account_type || 'Non renseigné'}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCompte(account.id, account.operator)}
                      disabled={!canManageSettings}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <Button variant="outline" className="w-full" onClick={() => setAddCompteOpen(true)} disabled={!canManageSettings}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter un compte
          </Button>
          {!canManageSettings && <p className="mt-2 text-xs text-muted-foreground">Seul le propriétaire peut gérer les comptes.</p>}
        </div>

        <div className="rounded-xl border bg-card p-6 animate-fade-in-up delay-2">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Sun className="h-4 w-4 text-primary" /> Thème</h3>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((item) => (
              <button
                key={item.value}
                onClick={() => setTheme(item.value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
                  theme === item.value ? 'border-primary bg-primary/10' : 'hover:bg-muted',
                )}
              >
                <item.icon className={cn('h-5 w-5', theme === item.value ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-sm font-medium', theme === item.value ? 'text-primary' : 'text-muted-foreground')}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={addCompteOpen} onOpenChange={setAddCompteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un compte de paiement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div>
              <Label htmlFor="operateur" className="text-sm font-medium">Opérateur *</Label>
              <select
                id="operateur"
                value={newCompte.operateur}
                onChange={(event) => setNewCompte((current) => ({ ...current, operateur: event.target.value, customOperateur: event.target.value === '__custom__' ? current.customOperateur : '' }))}
                className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Choisir un opérateur…</option>
                <option value="Mixx">Mixx (standard)</option>
                <option value="Flooz">Flooz (standard)</option>
                {canAddMore && <option value="__custom__">Ajouter personnalisé</option>}
                {!canAddMore && <option disabled>Max {MAX_CUSTOM_OPERATORS} opérateurs atteint</option>}
              </select>
            </div>

            {canAddMore && newCompte.operateur === '__custom__' && (
              <div className="animate-fade-in-up">
                <Label htmlFor="custom-op" className="text-sm font-medium">Nom personnalisé *</Label>
                <Input
                  id="custom-op"
                  value={newCompte.customOperateur}
                  onChange={(event) => setNewCompte((current) => ({ ...current, customOperateur: event.target.value }))}
                  placeholder="Ex: Wave, PayTech, Orange Money…"
                  autoFocus
                  className="mt-1.5"
                />
              </div>
            )}

            <div>
              <Label htmlFor="numero" className="text-sm font-medium">Numéro *</Label>
              <Input id="numero" value={newCompte.numero} onChange={(event) => setNewCompte((current) => ({ ...current, numero: event.target.value }))} placeholder="90 XX XX XX" className="mt-1.5" />
            </div>

            <div>
              <Label className="mb-2 block text-sm font-medium">Type de compte</Label>
              <div className="grid grid-cols-2 gap-2">
                {['Personnel', 'Marchand'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewCompte((current) => ({ ...current, type }))}
                    className={cn(
                      'rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all duration-150',
                      newCompte.type === type
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50',
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {!canAddMore && customOperators.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 animate-fade-in-up dark:border-amber-800 dark:bg-amber-950">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">Limite atteinte</p>
                <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">Vous avez {customOperators.length}/{MAX_CUSTOM_OPERATORS} opérateur(s) personnalisé(s).</p>
              </div>
            )}

            <Button
              onClick={handleAddCompte}
              disabled={!resolvedOperator || !newCompte.numero.trim() || !canManageSettings}
              size="lg"
              className="mt-2 w-full"
            >
              Ajouter le compte
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
