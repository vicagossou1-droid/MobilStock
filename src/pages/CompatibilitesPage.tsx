import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Puzzle, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCompatibilities } from "@/hooks/useCompatibilities";
import { useStock } from "@/hooks/useStock";
import { getErrorMessage } from "@/utils/errors";

const emptyForm = { piece: "", modeles: "" };

export default function CompatibilitesPage() {
  const { compatibilities, loading, addCompatibility, updateCompatibility, deleteCompatibility } = useCompatibilities();
  const { items: stockItems, loading: stockLoading } = useStock();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return compatibilities;
    return compatibilities.filter(
      (c) =>
        c.piece_name.toLowerCase().includes(q) ||
        c.supported_models.some((m) => m.toLowerCase().includes(q))
    );
  }, [compatibilities, search]);

  const stockPieceOptions = useMemo(() => {
    const groupedByPiece = new Map<string, Set<string>>();

    stockItems.forEach((item) => {
      const pieceName = item.nom.trim();
      const modelName = item.modele.trim();

      if (!pieceName) {
        return;
      }

      if (!groupedByPiece.has(pieceName)) {
        groupedByPiece.set(pieceName, new Set());
      }

      if (modelName) {
        groupedByPiece.get(pieceName)?.add(modelName);
      }
    });

    return Array.from(groupedByPiece.entries())
      .sort(([left], [right]) => left.localeCompare(right, "fr", { sensitivity: "base" }))
      .map(([pieceName, models]) => {
        const modelList = Array.from(models);
        const preview = modelList.slice(0, 2).join(", ");
        const remainingCount = modelList.length - 2;
        const label = preview
          ? `${pieceName} — ${preview}${remainingCount > 0 ? ` +${remainingCount}` : ""}`
          : pieceName;

        return { value: pieceName, label };
      });
  }, [stockItems]);

  const selectedStockPiece = stockPieceOptions.some((option) => option.value === form.piece) ? form.piece : "";

  const currentEditing = editingId ? compatibilities.find((item) => item.id === editingId) : null;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (compat: (typeof compatibilities)[number]) => {
    setEditingId(compat.id);
    setForm({ piece: compat.piece_name, modeles: compat.supported_models.join(", ") });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const piece = form.piece.trim();
    const modeles = form.modeles
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    if (!piece || modeles.length === 0) {
      toast.error("Veuillez renseigner la pièce et au moins un modèle compatible.");
      return;
    }

    const duplicate = compatibilities.find(
      (c) => c.piece_name.toLowerCase() === piece.toLowerCase() && c.id !== editingId
    );
    if (duplicate) {
      toast.error("Cette pièce existe déjà dans la base");
      return;
    }

    try {
      if (editingId && currentEditing) {
        await updateCompatibility(editingId, { piece_name: piece, supported_models: modeles });
        toast.success("Compatibilité mise à jour");
      } else {
        await addCompatibility({ piece_name: piece, supported_models: modeles });
        toast.success("Compatibilité ajoutée");
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde", { description: getErrorMessage(error) });
    }
  };

  const handleDelete = async (id: string) => {
    const item = compatibilities.find((c) => c.id === id);
    if (!item) return;
    if (!window.confirm(`Supprimer la compatibilité « ${item.piece_name} » ?`)) return;

    try {
      await deleteCompatibility(id);
      toast.success("Compatibilité supprimée");
    } catch (error) {
      toast.error("Erreur lors de la suppression", { description: getErrorMessage(error) });
    }
  };

  return (
    <div>
      <PageHeader title="Compatibilités" description="Base partagée entre toutes les boutiques">
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier compatibilité" : "Nouvelle compatibilité"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label>Choisir une pièce du stock</Label>
                <select
                  value={selectedStockPiece}
                  onChange={(e) => setForm({ ...form, piece: e.target.value })}
                  disabled={stockLoading || stockPieceOptions.length === 0}
                  className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {stockLoading
                      ? "Chargement des pièces du stock…"
                      : stockPieceOptions.length > 0
                        ? "Sélectionner une pièce existante…"
                        : "Aucune pièce disponible dans le stock"}
                  </option>
                  {stockPieceOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Pièce générique</Label>
                <Input
                  value={form.piece}
                  onChange={(e) => setForm({ ...form, piece: e.target.value })}
                  placeholder="Écran LCD Type A"
                />
              </div>
              <div>
                <Label>Modèles compatibles (séparés par virgules)</Label>
                <Input
                  value={form.modeles}
                  onChange={(e) => setForm({ ...form, modeles: e.target.value })}
                  placeholder="iPhone 11, iPhone 12, iPhone 13"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!form.piece.trim() || !form.modeles.trim() || loading}
              >
                {editingId ? "Sauvegarder" : "Ajouter"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="relative mb-6 max-w-md animate-fade-in-up delay-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher pièce ou modèle…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up delay-2">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-xl bg-card border p-5 hover:shadow-card-hover transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Puzzle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{c.piece_name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {c.supported_models.map((m) => (
                      <span key={m} className="inline-flex px-2 py-0.5 rounded-md bg-muted text-xs font-medium">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEditDialog(c)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">
            {compatibilities.length === 0 ? "Aucune compatibilité définie" : "Aucune compatibilité trouvée"}
          </p>
        )}
      </div>
    </div>
  );
}
