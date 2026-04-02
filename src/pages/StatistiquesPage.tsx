import { useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { DollarSign, ShoppingCart, Banknote, Smartphone, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useSales } from "@/hooks/useSales";

const COLORS = ["hsl(162, 63%, 41%)", "hsl(36, 95%, 54%)"];
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const CHART_GRID_COLOR = "hsl(var(--border))";
const CHART_TEXT_COLOR = "hsl(var(--muted-foreground))";

export default function StatistiquesPage() {
  const { data: sales = [] } = useSales();
  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  const totalAll = sales.reduce((s, v) => s + (v.total_amount || 0), 0);
  const totalCash = sales
    .filter((s) => s.payments?.[0]?.payment_method === "cash")
    .reduce((s, v) => s + (v.total_amount || 0), 0);
  const totalMobile = totalAll - totalCash;
  const cashPct = totalAll > 0 ? Math.round((totalCash / totalAll) * 100) : 0;
  const mobilePct = 100 - cashPct;

  const dailyData = useMemo(() =>
    DAYS.map((jour, i) => {
      const dayIndex = i === 6 ? 0 : i + 1;
      return {
        jour,
        ventes: sales
          .filter((s) => new Date(s.sale_date).getDay() === dayIndex)
          .reduce((sum, s) => sum + (s.total_amount || 0), 0),
      };
    }), [sales]);

  const paymentData = [
    { name: "Espèces", value: cashPct },
    { name: "Paiement mobile", value: mobilePct },
  ];

  const topProducts = useMemo(() => {
    const map = new Map<string, { nom: string; ventes: number; montant: number }>();
    sales
      .filter((s) => s.sale_type === "catalogue")
      .forEach((s) => {
        s.items?.forEach((item) => {
          const key = item.stock_item?.name || "Article non renseigné";
          const existing = map.get(key);
          if (existing) {
            existing.ventes += item.quantity || 0;
            existing.montant += (item.unit_price || 0) * (item.quantity || 0);
          } else {
            map.set(key, {
              nom: key,
              ventes: item.quantity || 0,
              montant: (item.unit_price || 0) * (item.quantity || 0),
            });
          }
        });
      });
    return [...map.values()].sort((a, b) => b.ventes - a.ventes).slice(0, 5);
  }, [sales]);

  const maxValue = Math.max(...dailyData.map((d) => d.ventes), 50000);
  const roundedMax = Math.ceil(maxValue / 50000) * 50000;
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((roundedMax / 4) * i));

  return (
    <div>
      <PageHeader title="Statistiques" description="Performance de votre boutique" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Chiffre d'affaires" value={formatPrice(totalAll)} icon={<DollarSign className="h-5 w-5" />} delay={0} />
        <StatCard title="Nombre de ventes" value={String(sales.length)} icon={<ShoppingCart className="h-5 w-5" />} delay={60} />
        <StatCard title="Total espèces" value={formatPrice(totalCash)} icon={<Banknote className="h-5 w-5" />} delay={120} />
        <StatCard title="Total mobile" value={formatPrice(totalMobile)} icon={<Smartphone className="h-5 w-5" />} delay={180} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 rounded-xl bg-card shadow-card p-5 animate-fade-in-up delay-3">
          <h3 className="font-semibold mb-4">Ventes par jour</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} strokeOpacity={0.4} />
                <XAxis dataKey="jour" tick={{ fontSize: 12, fill: CHART_TEXT_COLOR }} axisLine={{ stroke: CHART_GRID_COLOR }} tickLine={{ stroke: CHART_GRID_COLOR }} />
                <YAxis tick={{ fontSize: 11, fill: CHART_TEXT_COLOR }} axisLine={{ stroke: CHART_GRID_COLOR }} tickLine={{ stroke: CHART_GRID_COLOR }} ticks={ticks} tickFormatter={(v) => `${v / 1000}k`} domain={[0, roundedMax]} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Bar dataKey="ventes" fill="hsl(162, 63%, 41%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-card shadow-card p-5 animate-fade-in-up delay-4">
          <h3 className="font-semibold mb-4">Répartition paiements</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                  {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {paymentData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-muted-foreground">{d.name} ({d.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-card shadow-card p-5 animate-fade-in-up delay-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Produits les plus vendus</h3>
        <div className="space-y-3">
          {topProducts.map((p, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.nom}</p>
                <p className="text-xs text-muted-foreground">{p.ventes} ventes</p>
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatPrice(p.montant)}</p>
            </div>
          ))}
          {topProducts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée</p>}
        </div>
      </div>
    </div>
  );
}
