import { useState, type Dispatch, type SetStateAction } from "react";
import { Plus, Search, Package, Edit, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useStock } from "@/hooks/useStock";
import { useBoutique } from "@/hooks/useBoutique";
import { MARQUES, TYPES_PIECE } from "@/types";
import { cn } from "@/lib/utils";

const emptyItem = { marque: "", serie: "", modele: "", typePiece: "", nom: "", quantite: 0, prixClient: 0, prixTechnicien: 0, emplacement: "" };
type StockFormValues = typeof emptyItem;
type EditableStockFormValues = StockFormValues & { id: string };

export default function StockPage() {
  // ===== TOUS LES HOOKS EN PREMIER =====
  const { items, loading, error, addItem, updateItem, deleteItem } = useStock();
  const { boutique } = useBoutique();

  const [search, setSearch] = useState("");
  const [filterMarque, setFilterMarque] = useState("");
  const [filterType, setFilterType] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [form, setForm] = useState<StockFormValues>(emptyItem);
  const [editForm, setEditForm] = useState<EditableStockFormValues | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== VARIABLES CALCULÉES APRÈS LES HOOKS =====
  const lowThreshold = boutique?.stock_threshold ?? 5;

  const filtered = items.filter((item) => {
    const searchTerm = search.toLowerCase();
    const name = item.nom.toLowerCase();
    const brand = item.marque.toLowerCase();
    const model = item.modele.toLowerCase();
    const partType = item.typePiece.toLowerCase();

    const matchSearch =
      name.includes(searchTerm) ||
      brand.includes(searchTerm) ||
      model.includes(searchTerm) ||
      partType.includes(searchTerm);

    const matchMarque = !filterMarque || item.marque === filterMarque;
    const matchType = !filterType || item.typePiece === filterType;
    return matchSearch && matchMarque && matchType;
  });

  const handleAdd = async () => {
    if (!form.nom || !form.modele || !form.marque || !form.typePiece) return;
    
    setIsSubmitting(true);
    try {
      await addItem(form);
      setForm(emptyItem);
      setDialogOpen(false);
      toast.success("Pièce ajoutée au stock", { description: `${form.nom} - ${form.modele}` });
    } catch (err) {
      toast.error("Erreur lors de l'ajout", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: typeof items[0]) => {
    setEditForm({ ...item });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;
    
    setIsSubmitting(true);
    try {
      const { id, ...updates } = editForm;
      await updateItem(id, updates);
      setEditDialogOpen(false);
      setEditForm(null);
      toast.success("Pièce modifiée");
    } catch (err) {
      toast.error("Erreur lors de la modification", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const item = items.find((i) => i.id === id);
    try {
      await deleteItem(id);
      toast.success("Pièce supprimée", { description: item ? `${item.nom} - ${item.modele}` : undefined });
    } catch (err) {
      toast.error("Erreur lors de la suppression", { description: err instanceof Error ? err.message : undefined });
    }
  };

  const formatPrice = (n: number | undefined) => (n || 0).toLocaleString("fr-FR") + " FCFA";

  const getStockBadge = (quantite: number) => {
    if (quantite === 0) return { status: "rupture", className: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-200" };
    if (quantite <= lowThreshold) return { status: "faible", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200" };
    return { status: "ok", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200" };
  };

  const uniqueMarques = [...new Set(items.map((item) => item.marque))].filter(Boolean);
  const uniqueTypes = [...new Set(items.map((item) => item.typePiece))].filter(Boolean);

  const StockForm = <T extends StockFormValues>({ data, setData, onSubmit, submitLabel }: { data: T; setData: Dispatch<SetStateAction<T>>; onSubmit: () => void; submitLabel: string }) => (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Marque *</Label>
          <select value={data.marque} onChange={(e) => setData({ ...data, marque: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Sélectionner…</option>
            {MARQUES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <Label>Série</Label>
          <Input value={data.serie} onChange={(e) => setData({ ...data, serie: e.target.value })} placeholder="Ex: Hot, Note, Galaxy S" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Modèle *</Label>
          <Input value={data.modele} onChange={(e) => setData({ ...data, modele: e.target.value })} placeholder="iPhone 13, Hot 10i…" />
        </div>
        <div>
          <Label>Type de pièce *</Label>
          <select value={data.typePiece} onChange={(e) => setData({ ...data, typePiece: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Sélectionner…</option>
            {TYPES_PIECE.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label>Nom de la pièce *</Label>
        <Input value={data.nom} onChange={(e) => setData({ ...data, nom: e.target.value })} placeholder="Écran LCD Original" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Quantité</Label>
          <Input type="number" value={data.quantite || ""} onChange={(e) => setData({ ...data, quantite: +e.target.value })} />
        </div>
        <div>
          <Label>Prix client</Label>
          <Input type="number" value={data.prixClient || ""} onChange={(e) => setData({ ...data, prixClient: +e.target.value })} />
        </div>
        <div>
          <Label>Prix technicien</Label>
          <Input type="number" value={data.prixTechnicien || ""} onChange={(e) => setData({ ...data, prixTechnicien: +e.target.value })} />
        </div>
      </div>
      <div>
        <Label>Emplacement</Label>
        <Input value={data.emplacement} onChange={(e) => setData({ ...data, emplacement: e.target.value })} placeholder="A1-03" />
      </div>
      <Button onClick={onSubmit} disabled={!data.nom || !data.modele || !data.marque || !data.typePiece || isSubmitting} className="w-full">
        {isSubmitting ? "En cours..." : submitLabel}
      </Button>
    </div>
  );

  const SkeletonCard = () => (
    <div className="rounded-lg bg-card shadow-card p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-8 w-8 rounded-md bg-gray-300 dark:bg-gray-600"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-4/5"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
      </div>
    </div>
  );

  return (
    <div>
      {loading && items.length === 0 && (
        <div>
          <PageHeader title="Gestion du stock" description="Chargement du stock...">
            <Button disabled><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
          </PageHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!(loading && items.length === 0) && (
        <>
          <PageHeader title="Gestion du stock" description={`${items.length} références en stock`}>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Nouvelle pièce</DialogTitle></DialogHeader>
                <StockForm data={form} setData={setForm} onSubmit={handleAdd} submitLabel="Ajouter au stock" />
              </DialogContent>
            </Dialog>
          </PageHeader>

          {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 animate-fade-in-up delay-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom, modèle ou marque…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4 mr-2" /> Filtres {(filterMarque || filterType) && <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">{(filterMarque ? 1 : 0) + (filterType ? 1 : 0)}</span>}
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4 animate-fade-in-up">
          <select value={filterMarque} onChange={(e) => setFilterMarque(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Toutes les marques</option>
            {uniqueMarques.map((marque) => <option key={marque} value={marque}>{marque}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Tous les types</option>
            {uniqueTypes.map((typePiece) => <option key={typePiece} value={typePiece}>{typePiece}</option>)}
          </select>
          {(filterMarque || filterType) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterMarque(""); setFilterType(""); }}>Réinitialiser</Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in-up delay-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Pièce</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">Marque</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Modèle</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Qté</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Prix client</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Prix tech.</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Empl.</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                        <Package className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="font-medium">{item.nom}</span>
                        {item.typePiece && <p className="text-xs text-muted-foreground">{item.typePiece}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{item.marque}</td>
                  <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{item.modele}</td>
                  <td className="py-3 px-4 text-center">
                    {(() => {
                      const status = getStockBadge(item.quantite);
                      return (
                        <span title={status.status} className={cn("inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-bold", status.className)}>
                          {item.quantite}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums hidden md:table-cell">{formatPrice(item.prixClient)}</td>
                  <td className="py-3 px-4 text-right tabular-nums hidden lg:table-cell">{formatPrice(item.prixTechnicien)}</td>
                  <td className="py-3 px-4 text-center hidden lg:table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-mono">{item.emplacement}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">Aucune pièce trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Modifier la pièce</DialogTitle></DialogHeader>
      {editForm && <StockForm data={editForm} setData={setEditForm} onSubmit={handleSaveEdit} submitLabel="Sauvegarder" />}
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
