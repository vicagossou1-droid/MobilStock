import { useMemo, useState } from 'react';
import { Package, ShoppingCart, DollarSign, Smartphone, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import StatCard from '@/components/StatCard';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/hooks/useDashboard';
import { useSales } from '@/hooks/useSales';
import { useStock } from '@/hooks/useStock';

type TimeRange = 'semaine' | 'mois' | 'annee';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janv', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { recentSales, lowStockItems } = useDashboard();
  const { sales: allSales } = useSales();
  const { items: stock } = useStock();
  const [timeRange, setTimeRange] = useState<TimeRange>('semaine');
  const [selectedMonth, setSelectedMonth] = useState('tous');
  const [selectedYear, setSelectedYear] = useState('tous');

  const availableYears = Array.from(new Set(allSales.map((sale) => new Date(sale.sale_date).getFullYear()))).sort();
  const chartGridColor = 'hsl(var(--border))';
  const chartTextColor = 'hsl(var(--muted-foreground))';
  const formatPrice = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;

  const todaySales = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return recentSales.filter((sale) => sale.sale_date.startsWith(today));
  }, [recentSales]);

  const stockThreshold = 5;
  const outOfStock = lowStockItems.filter((item) => item.quantite === 0);

  const chartData = useMemo(() => {
    if (timeRange === 'semaine') {
      return DAYS.map((day, index) => {
        const dayIndex = index === 6 ? 0 : index + 1;
        const total = allSales
          .filter((sale) => new Date(sale.sale_date).getDay() === dayIndex)
          .reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
        return { label: day, ventes: total };
      });
    }

    if (timeRange === 'mois' && selectedMonth !== 'tous') {
      const monthIndex = MONTHS.indexOf(selectedMonth);
      const monthSales = allSales.filter((sale) => new Date(sale.sale_date).getMonth() === monthIndex);
      return ['S1', 'S2', 'S3', 'S4', 'S5'].map((week, index) => {
        const total = monthSales
          .filter((sale) => Math.floor((new Date(sale.sale_date).getDate() - 1) / 7) + 1 === index + 1)
          .reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
        return { label: week, ventes: total };
      });
    }

    if (timeRange === 'annee') {
      if (selectedYear !== 'tous') {
        const selectedYearNumber = Number(selectedYear);
        return MONTHS.map((month, index) => {
          const total = allSales
            .filter((sale) => {
              const saleDate = new Date(sale.sale_date);
              return saleDate.getFullYear() === selectedYearNumber && saleDate.getMonth() === index;
            })
            .reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
          return { label: month, ventes: total };
        });
      }

      return Array.from(
        allSales.reduce((yearMap, sale) => {
          const year = new Date(sale.sale_date).getFullYear();
          yearMap.set(year, (yearMap.get(year) ?? 0) + (sale.total_amount || 0));
          return yearMap;
        }, new Map<number, number>()),
      )
        .sort((first, second) => first[0] - second[0])
        .map(([year, total]) => ({ label: year.toString(), ventes: total }));
    }

    return MONTHS.map((month, index) => {
      const total = allSales
        .filter((sale) => new Date(sale.sale_date).getMonth() === index)
        .reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
      return { label: month, ventes: total };
    });
  }, [allSales, selectedMonth, selectedYear, timeRange]);

  const maxValue = Math.max(...chartData.map((item) => item.ventes), timeRange === 'semaine' ? 150000 : 300000);
  const roundedMax = Math.ceil(maxValue / 50000) * 50000;
  const ticks = Array.from({ length: Math.floor(roundedMax / 50000) + 1 }, (_, index) => index * 50000);
  const totalStock = stock.reduce((sum, item) => sum + item.quantite, 0);
  const totalReferences = stock.length;

  return (
    <div>
      <PageHeader title="Tableau de bord" description="Vue d'ensemble de votre boutique" />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Ventes du jour" value={formatPrice(todaySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0))} icon={<DollarSign className="h-5 w-5" />} delay={0} />
        <StatCard title="Articles vendus" value={String(todaySales.reduce((sum, sale) => sum + (sale.items?.length || 0), 0))} icon={<ShoppingCart className="h-5 w-5" />} delay={60} />
        <StatCard title="Pièces en stock" value={String(totalStock)} icon={<Package className="h-5 w-5" />} subtitle={`${totalReferences} références`} delay={120} />
        <StatCard title="Alerte stock" value={`${lowStockItems.length} faible / ${outOfStock.length} rupture`} icon={<Package className="h-5 w-5" />} subtitle={`Seuil ${stockThreshold}`} delay={180} />
      </div>

      <div className="mb-6 rounded-xl bg-card p-5 shadow-card animate-fade-in-up delay-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Ventes</h2>
          <div className="flex items-center gap-3">
            <div className="flex overflow-hidden rounded-lg border bg-background">
              {(['semaine', 'mois', 'annee'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setTimeRange(range);
                    setSelectedMonth('tous');
                    setSelectedYear('tous');
                  }}
                  className={cn('px-3 py-1.5 text-xs font-medium transition-all', timeRange === range ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                >
                  {range === 'semaine' ? 'Semaine' : range === 'mois' ? 'Mois' : 'Année'}
                </button>
              ))}
            </div>
            {timeRange === 'mois' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filtrer :</span>
                <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground">
                  <option value="tous">Tous les mois</option>
                  {MONTHS.map((month) => <option key={month} value={month}>{month}</option>)}
                </select>
              </div>
            )}
            {timeRange === 'annee' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filtrer :</span>
                <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground">
                  <option value="tous">Toutes les années</option>
                  {availableYears.map((year) => <option key={year} value={year.toString()}>{year}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} strokeOpacity={0.4} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: chartTextColor }} axisLine={{ stroke: chartGridColor }} tickLine={{ stroke: chartGridColor }} />
              <YAxis tick={{ fontSize: 11, fill: chartTextColor }} axisLine={{ stroke: chartGridColor }} tickLine={{ stroke: chartGridColor }} ticks={ticks} tickFormatter={(value) => `${value / 1000}k`} domain={[0, roundedMax]} />
              <Tooltip formatter={(value: number) => formatPrice(value)} />
              <Bar dataKey="ventes" fill="hsl(162, 63%, 41%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in-up delay-3 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Ventes récentes</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/historique')} className="text-xs text-muted-foreground">
              Voir tout <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1">
            {recentSales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{sale.items?.length || 0} pièce(s)</p>
                    <p className="text-xs text-muted-foreground">{sale.client_type === 'technicien' ? 'Technicien' : 'Client'} · {sale.sale_type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatPrice(sale.total_amount || 0)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(sale.sale_date).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            ))}
            {recentSales.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aucune vente</p>}
          </div>
        </div>

        <div className="rounded-xl bg-card p-5 shadow-card animate-fade-in-up delay-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Alerte stock</h2>
            <div className="flex gap-2">
              <span title="faible" className="flex h-5 items-center justify-center rounded-full bg-amber-100 px-2 text-[10px] font-bold text-amber-700 dark:border dark:border-amber-600 dark:bg-amber-700/20 dark:text-amber-100">{lowStockItems.length}</span>
              <span title="rupture" className="flex h-5 items-center justify-center rounded-full bg-red-100 px-2 text-[10px] font-bold text-red-600 dark:border dark:border-red-600 dark:bg-red-700/20 dark:text-red-100">{outOfStock.length}</span>
            </div>
          </div>
          <div className="space-y-2">
            {outOfStock.map((item) => (
              <div key={`out-${item.id}`} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 dark:border-red-700 dark:bg-red-900/35">
                <div>
                  <p className="text-sm font-medium">{item.nom}</p>
                  <p className="text-xs text-muted-foreground">{item.modele}</p>
                </div>
                <span className="text-sm font-bold text-red-600 dark:text-red-200">Rupture</span>
              </div>
            ))}
            {lowStockItems.filter((item) => item.quantite > 0).map((item) => (
              <div key={`low-${item.id}`} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 dark:border-amber-700 dark:bg-amber-950/25">
                <div>
                  <p className="text-sm font-medium">{item.nom}</p>
                  <p className="text-xs text-muted-foreground">{item.modele}</p>
                </div>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-200">{item.quantite}</span>
              </div>
            ))}
            {lowStockItems.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Tout est en stock</p>}
          </div>
          <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => navigate('/app/stock')}>Gérer le stock</Button>
        </div>
      </div>
    </div>
  );
}
