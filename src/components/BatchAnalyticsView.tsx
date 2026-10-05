import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Receipt,
  PiggyBank,
  Percent,
  Scale,
  Users,
  Trophy,
  FileDown,
  Printer,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  ChartColumn,
  Wheat,
  ShieldAlert,
  Info,
} from "lucide-react";
import { useFarm } from "../context/FarmContext";
import { money, useBatchAnalytics } from "./analytics/batchAnalytics";

const card =
  "rounded-xl border border-slate-200/60 bg-white dark:border-slate-700/50 dark:bg-slate-800/60";

function Trend({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
      {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function Kpi({ icon: Icon, label, value, sub, accent }: { icon: typeof Users; label: string; value: string; sub?: React.ReactNode; accent: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={`${card} p-4 shadow-sm`}>
      <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${accent}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="mt-3 text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs mt-1">{sub}</div>}
    </motion.div>
  );
}

export function BatchAnalyticsView() {
  const { canViewAnalytics, currentRole, loading } = useFarm();
  const a = useBatchAnalytics();
  const { rows, totals, best, worst, season, costComposition, cur } = a;

  // ── Access control: Owners always pass, Managers need the Owner flag ──────
  if (!canViewAnalytics) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${card} p-10 text-center max-w-xl mx-auto`}
      >
        <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40">
          <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
          Financial analytics access restricted
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This module is limited to Owners. Enable{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">Allow managers to view financial analytics</span>{" "}
          in App Settings to grant managers access.
        </p>
        <p className="mt-3 text-xs text-slate-400">Signed in as <span className="capitalize font-medium">{currentRole}</span></p>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className={`${card} h-28 animate-pulse`} />)}
        </div>
        <div className={`${card} h-72 animate-pulse`} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={`${card} p-10 text-center`}>
        <ChartColumn className="w-8 h-8 mx-auto text-slate-400" />
        <h2 className="mt-3 font-semibold text-slate-800 dark:text-slate-200">
          No batches to analyse yet
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Create a batch and log feed, sales and expenses to unlock batch financial comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ChartColumn className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Batch Financial Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {a.currentFarm.name} &middot; {rows.length} batches &middot; all values in {cur}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={a.downloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
          >
            <FileDown className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={a.printReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <Printer className="w-4 h-4" /> PDF report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Kpi icon={CircleDollarSign} accent="bg-emerald-600" label="Total revenue" value={money(totals.revenue)} />
        <Kpi icon={Receipt} accent="bg-rose-600" label="Total cost" value={money(totals.cost)} />
        <Kpi
          icon={PiggyBank}
          accent={totals.net >= 0 ? "bg-teal-600" : "bg-red-600"}
          label="Net profit"
          value={money(totals.net)}
          sub={
            <span
              className={totals.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
            >
              {totals.net >= 0 ? "Profitable" : "Running at a loss"}
            </span>
          }
        />
        <Kpi
          icon={Percent}
          accent="bg-blue-600"
          label="Average margin"
          value={`${totals.margin.toFixed(1)}%`}
          sub={<Trend value={totals.margin} />}
        />
        <Kpi
          icon={Scale}
          accent="bg-indigo-600"
          label="Portfolio ROI"
          value={`${totals.roi.toFixed(1)}%`}
          sub={<Trend value={totals.roi} />}
        />
        <Kpi
          icon={Users}
          accent="bg-amber-500"
          label="Birds in scope"
          value={totals.birds.toLocaleString()}
          sub={
            <span className="text-slate-400">
              {cur} {money(totals.revenue / Math.max(1, totals.birds))}/bird
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-white p-5 dark:border-emerald-900/40 dark:from-emerald-900/20 dark:to-slate-800/60"
        >
          <h3 className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4" /> Top performer
          </h3>
          {best && (
            <>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-2">{best.batch.name}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Net {money(best.f.net)} {cur} &middot; margin {best.f.margin.toFixed(1)}%
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div>ROI <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{best.f.roi.toFixed(1)}%</span></div>
                <div>Feed cost {money(best.f.feedCostPerKg)}/{a.settings.weightUnit}</div>
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-red-200/60 bg-gradient-to-br from-red-50 to-white p-5 dark:border-red-900/40 dark:from-red-900/20 dark:to-slate-800/60"
        >
          <h3 className="font-semibold text-red-800 dark:text-red-300 flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4" /> Needs attention
          </h3>
          {worst && (
            <>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-2">{worst.batch.name}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Net {money(worst.f.net)} {cur} &middot; margin {worst.f.margin.toFixed(1)}%
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div>ROI <span className="font-mono font-semibold text-red-600 dark:text-red-400">{worst.f.roi.toFixed(1)}%</span></div>
                <div>Cost/bird <span className="font-mono font-semibold">{money(worst.f.costPerBird)}</span></div>
              </div>
            </>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className={`${card} p-5`}>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-amber-500" /> Mortality impact
          </h3>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-2">{money(totals.mortalityLoss)} {cur}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            cost of {totals.mortality.toLocaleString()} lost birds &middot; {totals.cost > 0 ? ((totals.mortalityLoss / totals.cost) * 100).toFixed(1) : "0.0"}% of total cost
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, totals.cost > 0 ? (totals.mortalityLoss / totals.cost) * 100 : 0).toFixed(1)}%` }} />
          </div>
        </motion.div>
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700/50">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Batch comparison</h3>
          <span className="text-xs text-slate-400 flex items-center gap-1"><Info className="w-3.5 h-3.5" /> click a header to sort</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                <th className="px-4 py-2.5 font-semibold">#</th>
                <th className="px-4 py-2.5 font-semibold">Batch</th>
                {(
                  [
                    ["revenue", "Revenue"],
                    ["totalCost", "Total cost"],
                    ["net", "Net"],
                    ["margin", "Margin"],
                    ["roi", "ROI"],
                    ["costPerBird", "Cost/bird"],
                    ["feedCostPerKg", "Feed/kg"],
                    ["mortalityRate", "Mortality"],
                  ] as [typeof a.sortKey, string][]
                ).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => a.toggleSort(key)}
                    className={`px-4 py-2.5 font-semibold text-right cursor-pointer select-none hover:text-emerald-600 dark:hover:text-emerald-400 ${
                      a.sortKey === key ? "text-emerald-600 dark:text-emerald-400" : ""
                    }`}
                  >
                    {label}
                    {a.sortKey === key && (a.sortDir === "desc" ? " ↓" : " ↑")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.batch.id}
                  className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/20"
                >
                  <td className="px-4 py-2.5 text-slate-400 font-mono">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      {r.batch.name}
                      {best && r.batch.id === best.batch.id && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                    </div>
                    <div className="text-xs text-slate-400 capitalize">
                      {r.batch.type} &middot; {r.batch.status} &middot; {r.f.birds.toLocaleString()} birds
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {money(r.f.revenue)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {money(r.f.totalCost)}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono tabular-nums font-semibold ${
                      r.f.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {money(r.f.net)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{r.f.margin.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{r.f.roi.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {money(r.f.costPerBird)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {money(r.f.feedCostPerKg)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        r.f.mortalityRate <= 2
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : r.f.mortalityRate <= 5
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      }`}
                    >
                      {r.f.mortalityRate.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 dark:bg-slate-900/40 font-semibold text-slate-800 dark:text-slate-200">
                <td className="px-4 py-2.5" />
                <td className="px-4 py-2.5">Portfolio total</td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums">{money(totals.revenue)}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums">{money(totals.cost)}</td>
                <td
                  className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                    totals.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {money(totals.net)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums">{totals.margin.toFixed(1)}%</td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums">{totals.roi.toFixed(1)}%</td>
                <td className="px-4 py-2.5" />
                <td className="px-4 py-2.5" />
                <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                  {totals.birds + totals.mortality > 0
                    ? ((totals.mortality / (totals.birds + totals.mortality)) * 100).toFixed(2)
                    : "0.00"}
                  %
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${card} p-5 lg:col-span-2`}>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Quarterly performance trend
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Revenue vs cost vs net profit, grouped by calendar quarter
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={season} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <Tooltip
                  formatter={(v: number, n: string) => [money(Number(v)), n]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="Cost" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="net" name="Net profit" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${card} p-5`}>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <Wheat className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Cost composition
          </h3>
          <div className="space-y-3">
            {costComposition.map((c) => {
              const pct = totals.cost > 0 ? (c.value / totals.cost) * 100 : 0;
              return (
                <div key={c.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{c.label}</span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {money(c.value)} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className={`h-full ${c.color}`} style={{ width: `${pct.toFixed(1)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Total cost</span>
            <span className="font-semibold font-mono tabular-nums text-slate-800 dark:text-slate-200">
              {money(totals.cost)} {cur}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}