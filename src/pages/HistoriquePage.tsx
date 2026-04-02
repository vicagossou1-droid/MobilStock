import PageHeader from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { useSales } from "@/hooks/useSales";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, X } from "lucide-react";

export default function HistoriquePage() {
  const { data: sales = [] } = useSales();
  
  const [paymentFilter, setPaymentFilter] = useState<"all" | "cash" | "mobile">("all");
  const [clientTypeFilter, setClientTypeFilter] = useState<"all" | "simple" | "technicien">("all");
  const [vendorFilter, setVendorFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const vendors = useMemo(() => {
    const unique = new Set<string>();
    sales.forEach((s) => {
      if (s.vendor?.full_name) unique.add(s.vendor.full_name);
    });
    return Array.from(unique).sort();
  }, [sales]);

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const paymentMethod = s.payments?.[0]?.payment_method;
      const clientType = s.client_type || "simple";
      const vendorName = s.vendor?.full_name || "Utilisateur non renseigné";
      
      if (paymentFilter !== "all") {
        if (paymentFilter === "cash" && paymentMethod !== "cash") return false;
        if (paymentFilter === "mobile" && paymentMethod !== "mobile") return false;
      }
      
      if (clientTypeFilter !== "all" && clientType !== clientTypeFilter) return false;
      if (vendorFilter && vendorName !== vendorFilter) return false;
      
      if (startDate) {
        const saleDate = new Date(s.sale_date);
        const filterStart = new Date(startDate);
        if (saleDate < filterStart) return false;
      }
      
      if (endDate) {
        const saleDate = new Date(s.sale_date);
        const filterEnd = new Date(endDate);
        filterEnd.setHours(23, 59, 59);
        if (saleDate > filterEnd) return false;
      }
      
      return true;
    });
  }, [sales, paymentFilter, clientTypeFilter, vendorFilter, startDate, endDate]);

  const hasActiveFilters = paymentFilter !== "all" || clientTypeFilter !== "all" || vendorFilter || startDate || endDate;

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  return (
    <div>
      <PageHeader title="Historique des ventes" description={`${sales.length} ventes enregistrées`}>
        <Button variant={hasActiveFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4 mr-2" /> Filtres {hasActiveFilters && <span className="ml-1 h-4 w-4 rounded-full bg-primary-foreground text-primary text-[10px] flex items-center justify-center">✓</span>}
        </Button>
      </PageHeader>

      <div className="mb-4 animate-fade-in-up">
        <div className="flex rounded-lg border bg-card overflow-hidden">
          {(["all", "cash", "mobile"] as const).map((f) => (
            <button key={f} onClick={() => setPaymentFilter(f)}
              className={cn("px-4 py-2 text-sm font-medium transition-all", paymentFilter === f ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {f === "all" ? "Tout" : f === "cash" ? "Espèces" : "Mobile"}
            </button>
          ))}
        </div>
      </div>

      {showFilters && (
        <div className="mb-4 p-4 rounded-xl bg-card border animate-fade-in-up space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Du</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Au</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Type de client</Label>
              <select value={clientTypeFilter} onChange={(e) => {
                const val = e.target.value;
                if (val === "all" || val === "simple" || val === "technicien") {
                  setClientTypeFilter(val);
                }
              }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="all">Tous</option>
                <option value="simple">Client</option>
                <option value="technicien">Technicien</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Vendeur</Label>
              <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Tous</option>
                {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={() => { setPaymentFilter("all"); setClientTypeFilter("all"); setVendorFilter(""); setStartDate(""); setEndDate(""); }}>
              <X className="h-3.5 w-3.5 mr-1" /> Réinitialiser filtres
            </Button>
          )}
        </div>
      )}

      <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in-up delay-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Articles</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Mode</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Paiement</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Montant</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Vendeur</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sale) => {
                const paymentMethod = sale.payments?.[0]?.payment_method;
                const operator = sale.payments?.[0]?.operator;
                const itemsCount = sale.items?.length || 0;
                const itemsNames = sale.items?.map((i) => i.stock_item?.name).filter(Boolean).join(", ") || "Non renseigné";
                
                return (
                  <tr key={sale.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">{new Date(sale.sale_date).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3 px-4 font-medium max-w-[200px] truncate" title={itemsNames}>{itemsCount} article(s)</td>
                    <td className="py-3 px-4 text-center hidden sm:table-cell">
                      <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", sale.client_type === "technicien" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground")}>
                        {sale.client_type === "technicien" ? "Technicien" : "Client"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-muted-foreground hidden md:table-cell">{sale.sale_type === "catalogue" ? "Catalogue" : sale.sale_type === "libre" ? "Libre" : "Non renseigné"}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", paymentMethod === "cash" ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                        {paymentMethod === "cash" ? "Espèces" : paymentMethod === "mobile" ? operator || "Paiement mobile" : "Non renseigné"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold tabular-nums">{formatPrice(sale.total_amount || 0)}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground hidden lg:table-cell">{sale.vendor?.full_name || "Utilisateur non renseigné"}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Aucune vente trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
