import { useState } from "react";
import { useFarm } from "../context/FarmContext";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Edit3, Trash2, Layers, Bird, Egg } from "lucide-react";
import type { Batch, BatchType } from "../types";

function BatchModal({ batch, onClose, onSave }: { batch?: Batch; onClose: () => void; onSave: (data: Omit<Batch, "id">) => void }) {
  const [form, setForm] = useState({
    name: batch?.name || "",
    type: (batch?.type || "broiler") as BatchType,
    startDate: batch?.startDate || new Date().toISOString().slice(0, 10),
    initialCount: batch?.initialCount || 1000,
    breed: batch?.breed || "Ross 308",
    initialAvgWeight: batch?.initialAvgWeight || 0.042,
    shedId: batch?.shedId || "",
    pointOfLayDate: batch?.pointOfLayDate || "",
    status: batch?.status || "active" as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, farmId: batch?.farmId || "farm-1" });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">{batch ? "Edit Batch" : "New Batch"}</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Batch Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="e.g. Broiler Batch C-01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as BatchType })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                <option value="broiler">Broiler</option>
                <option value="layer">Layer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Initial Count</label>
              <input type="number" min={1} value={form.initialCount} onChange={e => setForm({ ...form, initialCount: +e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Breed/Strain</label>
              <input value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Avg Weight (kg)</label>
              <input type="number" step="0.001" value={form.initialAvgWeight} onChange={e => setForm({ ...form, initialAvgWeight: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Shed ID</label>
              <input value={form.shedId} onChange={e => setForm({ ...form, shedId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" placeholder="Shed-1" />
            </div>
            {form.type === "layer" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Point of Lay Date</label>
                <input type="date" value={form.pointOfLayDate} onChange={e => setForm({ ...form, pointOfLayDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Batch["status"] })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:scale-[0.98] transition-all">Save Batch</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export function BatchManagementView() {
  const { data, auth, addBatch, updateBatch, deleteBatch, activeFlockCount, fcr, layingRate, canEditBatch } = useFarm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | undefined>();
  const [filter, setFilter] = useState<"all" | "broiler" | "layer">("all");

  const batches = data.batches
    .filter(b => b.farmId === auth.currentFarmId)
    .filter(b => filter === "all" || b.type === filter);

  const handleSave = (formData: Omit<Batch, "id">) => {
    if (editBatch) {
      updateBatch(editBatch.id, formData);
    } else {
      addBatch({ ...formData, farmId: auth.currentFarmId });
    }
    setModalOpen(false);
    setEditBatch(undefined);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Batch Management</h2>
        {canEditBatch && (
          <button onClick={() => { setEditBatch(undefined); setModalOpen(true); }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 shadow-sm active:scale-[0.98] transition-all">
            <Plus className="w-4 h-4" /> New Batch
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 w-fit">
        {(["all", "broiler", "layer"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${filter === f ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
            {f === "all" ? "All" : f + "s"}
          </button>
        ))}
      </div>

      {/* Batch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {batches.map(b => {
            const flock = activeFlockCount(b.id);
            const mortalityPct = ((b.initialCount - flock) / b.initialCount) * 100;
            const f = b.type === "broiler" ? fcr(b.id) : 0;
            const lr = b.type === "layer" ? layingRate(b.id) : 0;
            return (
              <motion.div key={b.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="rounded-xl border border-slate-200/60 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/60 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{b.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{b.breed} | {b.shedId}</p>
                  </div>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${b.type === "broiler" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                    {b.type === "broiler" ? <Bird className="w-3 h-3" /> : <Egg className="w-3 h-3" />}
                    {b.type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Active Flock</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-white">{flock.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Mortality</div>
                    <div className={`font-mono font-semibold ${mortalityPct > 5 ? "text-red-600" : "text-slate-900 dark:text-white"}`}>{mortalityPct.toFixed(1)}%</div>
                  </div>
                  {b.type === "broiler" && (
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">FCR</div>
                      <div className="font-mono font-semibold text-slate-900 dark:text-white">{f > 0 ? f.toFixed(2) : "N/A"}</div>
                    </div>
                  )}
                  {b.type === "layer" && (
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Laying Rate</div>
                      <div className="font-mono font-semibold text-slate-900 dark:text-white">{lr > 0 ? `${lr.toFixed(1)}%` : "N/A"}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Started</div>
                    <div className="text-slate-700 dark:text-slate-300">{b.startDate}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Status</div>
                    <span className={`capitalize text-xs font-medium ${b.status === "active" ? "text-emerald-600 dark:text-emerald-400" : b.status === "completed" ? "text-blue-600 dark:text-blue-400" : "text-slate-500"}`}>{b.status}</span>
                  </div>
                </div>

                {canEditBatch && (
                  <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    <button onClick={() => { setEditBatch(b); setModalOpen(true); }} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { if (confirm("Delete this batch?")) deleteBatch(b.id); }} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {batches.length === 0 && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No batches found. Create one to get started.</p>
        </div>
      )}

      <AnimatePresence>
        {modalOpen && <BatchModal batch={editBatch} onClose={() => { setModalOpen(false); setEditBatch(undefined); }} onSave={handleSave} />}
      </AnimatePresence>
    </div>
  );
}
