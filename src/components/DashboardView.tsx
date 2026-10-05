import { useFarm } from "../context/FarmContext";
import { motion } from "framer-motion";
import { Bird, Egg, TrendingUp, DollarSign, AlertTriangle, Layers, Activity } from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-slate-200/60 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/60 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">{value}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{sub}</div>}
      </div>
    </motion.div>
  );
}

export function DashboardView() {
  const { data, auth, activeFlockCount, layingRate, fcr, batchProfitLoss, currentRole } = useFarm();

  const farmBatches = data.batches.filter(b => b.farmId === auth.currentFarmId && b.status === "active");
  const totalFlock = farmBatches.reduce((s, b) => s + activeFlockCount(b.id), 0);
  const broilerBatches = farmBatches.filter(b => b.type === "broiler");
  const layerBatches = farmBatches.filter(b => b.type === "layer");
  const totalEggsToday = data.eggLogs
    .filter(e => e.farmId === auth.currentFarmId)
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.totalEggs || 0;

  const avgFcr = broilerBatches.length > 0
    ? broilerBatches.reduce((s, b) => s + fcr(b.id), 0) / broilerBatches.length
    : 0;

  const monthNet = farmBatches.reduce((s, b) => s + batchProfitLoss(b.id).net, 0);

  const alerts: { msg: string; severity: "warning" | "danger" }[] = [];
  farmBatches.forEach(b => {
    const flock = activeFlockCount(b.id);
    const mortalityPct = ((b.initialCount - flock) / b.initialCount) * 100;
    if (mortalityPct > 5) alerts.push({ msg: `${b.name}: ${mortalityPct.toFixed(1)}% mortality`, severity: "danger" });
    if (b.type === "broiler") {
      const f = fcr(b.id);
      if (f > 1.85) alerts.push({ msg: `${b.name}: FCR ${f.toFixed(2)} exceeds threshold`, severity: "warning" });
    }
  });

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={Layers} label="Active Batches" value={String(farmBatches.length)} color="bg-emerald-600" />
        <StatCard icon={Bird} label="Total Flock" value={totalFlock.toLocaleString()} color="bg-teal-600" />
        <StatCard icon={Egg} label="Latest Egg Collection" value={totalEggsToday.toLocaleString()} sub={`${layerBatches.length} layer batches`} color="bg-amber-500" />
        <StatCard icon={TrendingUp} label="Avg FCR (Broilers)" value={avgFcr > 0 ? avgFcr.toFixed(2) : "N/A"} sub={avgFcr < 1.6 ? "Good" : avgFcr < 1.85 ? "Average" : "Poor"} color="bg-blue-600" />
        <StatCard icon={DollarSign} label="Net P&L (All Batches)" value={`KES ${monthNet.toLocaleString()}`} color={monthNet >= 0 ? "bg-emerald-600" : "bg-red-600"} />
      </div>

      {/* Batch Type Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-emerald-50 to-white p-5 dark:border-slate-700/50 dark:from-emerald-900/20 dark:to-slate-800/60"
        >
          <h3 className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4" /> Broiler Operations
          </h3>
          {broilerBatches.length === 0 ? (
            <p className="text-sm text-slate-500">No active broiler batches.</p>
          ) : (
            <div className="space-y-3">
              {broilerBatches.map(b => {
                const flock = activeFlockCount(b.id);
                const f = fcr(b.id);
                return (
                  <div key={b.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{b.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500 dark:text-slate-400 font-mono">{flock.toLocaleString()} birds</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${f < 1.6 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : f < 1.85 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                        FCR {f.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-amber-50 to-white p-5 dark:border-slate-700/50 dark:from-amber-900/20 dark:to-slate-800/60"
        >
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-3">
            <Egg className="w-4 h-4" /> Layer Operations
          </h3>
          {layerBatches.length === 0 ? (
            <p className="text-sm text-slate-500">No active layer batches.</p>
          ) : (
            <div className="space-y-3">
              {layerBatches.map(b => {
                const flock = activeFlockCount(b.id);
                const lr = layingRate(b.id);
                return (
                  <div key={b.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{b.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500 dark:text-slate-400 font-mono">{flock.toLocaleString()} hens</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${lr > 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : lr > 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                        {lr.toFixed(1)}% lay
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-red-200/60 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/20">
          <h4 className="font-semibold text-red-800 dark:text-red-300 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" /> Action Required
          </h4>
          <ul className="space-y-1">
            {alerts.map((a, i) => (
              <li key={i} className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${a.severity === "danger" ? "bg-red-500" : "bg-amber-500"}`} />
                {a.msg}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Recent Activity */}
      <div className="rounded-xl border border-slate-200/60 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/60">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Recent Activity</h3>
        <div className="space-y-2">
          {data.mortalityLogs
            .filter(m => m.farmId === auth.currentFarmId)
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 3)
            .map(m => {
              const batch = data.batches.find(b => b.id === m.batchId);
              return (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0 text-sm">
                  <div>
                    <span className="text-slate-700 dark:text-slate-300">{batch?.name || "Unknown"}</span>
                    <span className="text-slate-400 ml-2">{m.reason}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-red-600 dark:text-red-400 font-mono">-{m.count}</span>
                    <span className="text-xs text-slate-400">{m.date}</span>
                  </div>
                </div>
              );
            })}
          {data.feedLogs
            .filter(f => f.farmId === auth.currentFarmId)
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 3)
            .map(f => {
              const batch = data.batches.find(b => b.id === f.batchId);
              return (
                <div key={f.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0 text-sm">
                  <div>
                    <span className="text-slate-700 dark:text-slate-300">{batch?.name || "Unknown"}</span>
                    <span className="text-slate-400 ml-2 capitalize">{f.feedType.replace("_", " ")} feed</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">{f.quantityKg}kg</span>
                    <span className="text-xs text-slate-400">{f.date}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
