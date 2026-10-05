import { useState } from "react";
import { useFarm } from "../context/FarmContext";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Droplets, Pill, Egg, Scale } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ROSS_308_CURVE } from "../types";
import { toast } from "sonner";

type Tab = "mortality" | "feed" | "eggs" | "weights";

export function DailyOperationsView() {
  const { data, auth, addMortality, addFeed, addMedication, addEggCollection, addWeight, activeFlockCount, layingRate, fcr, totalFeedConsumed, totalWeightGained } = useFarm();
  const [tab, setTab] = useState<Tab>("mortality");
  const [showForm, setShowForm] = useState(false);

  const batches = data.batches.filter(b => b.farmId === auth.currentFarmId && b.status === "active");
  const [selBatch, setSelBatch] = useState(batches[0]?.id || "");

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "mortality", label: "Mortality", icon: Droplets },
    { id: "feed", label: "Feed & Med", icon: Pill },
    { id: "eggs", label: "Egg Collection", icon: Egg },
    { id: "weights", label: "Weights & FCR", icon: Scale },
  ];

  const selectedBatch = batches.find(b => b.id === selBatch);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Daily Operations</h2>
        <select value={selBatch} onChange={e => setSelBatch(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 w-fit overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {tab === "mortality" && <MortalityTab batchId={selBatch} batches={batches} />}
          {tab === "feed" && <FeedTab batchId={selBatch} batches={batches} />}
          {tab === "eggs" && selectedBatch?.type === "layer" && <EggTab batchId={selBatch} batches={batches} />}
          {tab === "eggs" && selectedBatch?.type !== "layer" && <div className="text-center py-12 text-slate-500"><Egg className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>Egg collection is only available for Layer batches.</p></div>}
          {tab === "weights" && <WeightsTab batchId={selBatch} batches={batches} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Mortality Tab ───────────────────────────────────────────────────────────
function MortalityTab({ batchId, batches }: { batchId: string; batches: any[] }) {
  const { data, auth, addMortality, activeFlockCount } = useFarm();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), count: 1, reason: "", culled: false });

  const logs = data.mortalityLogs.filter(m => m.batchId === batchId).sort((a, b) => b.date.localeCompare(a.date));
  const flock = activeFlockCount(batchId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMortality({ ...form, batchId, farmId: auth.currentFarmId });
    toast.success(`Logged ${form.count} mortality/deaths`);
    setShowForm(false);
    setForm({ date: new Date().toISOString().slice(0, 10), count: 1, reason: "", culled: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Active Flock: <span className="font-mono font-semibold text-slate-900 dark:text-white">{flock.toLocaleString()}</span>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 active:scale-[0.98] transition-all">
          <Plus className="w-3.5 h-3.5" /> Log Mortality
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="text-xs text-slate-500 dark:text-slate-400">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /></div>
              <div><label className="text-xs text-slate-500 dark:text-slate-400">Count</label><input type="number" min={1} value={form.count} onChange={e => setForm({ ...form, count: +e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono" /></div>
              <div><label className="text-xs text-slate-500 dark:text-slate-400">Reason</label><input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Disease" className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /></div>
              <div className="flex items-end"><label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><input type="checkbox" checked={form.culled} onChange={e => setForm({ ...form, culled: e.target.checked })} className="rounded" /> Culled</label></div>
            </div>
            <button type="submit" className="mt-3 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">Save</button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="rounded-xl border border-slate-200/60 bg-white dark:border-slate-700/50 dark:bg-slate-800/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr><th className="text-left px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">Date</th><th className="text-left px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">Count</th><th className="text-left px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">Reason</th><th className="text-left px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">Type</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{l.date}</td>
                <td className="px-4 py-2.5 font-mono text-red-600 dark:text-red-400">-{l.count}</td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{l.reason}</td>
                <td className="px-4 py-2.5"><span className={`px-1.5 py-0.5 rounded text-xs ${l.culled ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>{l.culled ? "Culled" : "Natural"}</span></td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No mortality logs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Feed & Medication Tab ───────────────────────────────────────────────────
function FeedTab({ batchId, batches }: { batchId: string; batches: any[] }) {
  const { data, auth, addFeed, addMedication, totalFeedConsumed } = useFarm();
  const [subTab, setSubTab] = useState<"feed" | "med">("feed");
  const [showForm, setShowForm] = useState(false);
  const [feedForm, setFeedForm] = useState({ date: new Date().toISOString().slice(0, 10), feedType: "starter" as any, bags50kg: 1, costPerBag: 2800 });
  const [medForm, setMedForm] = useState({ date: new Date().toISOString().slice(0, 10), name: "", dosage: "", method: "Drinking water", withdrawalDays: 0, cost: 0 });

  const feedLogs = data.feedLogs.filter(f => f.batchId === batchId).sort((a, b) => b.date.localeCompare(a.date));
  const medLogs = data.medicationLogs.filter(m => m.batchId === batchId).sort((a, b) => b.date.localeCompare(a.date));
  const totalKg = totalFeedConsumed(batchId);

  const handleFeed = (e: React.FormEvent) => {
    e.preventDefault();
    addFeed({ ...feedForm, batchId, farmId: auth.currentFarmId, quantityKg: feedForm.bags50kg * 50 });
    toast.success("Feed logged");
    setShowForm(false);
  };

  const handleMed = (e: React.FormEvent) => {
    e.preventDefault();
    addMedication({ ...medForm, batchId, farmId: auth.currentFarmId });
    toast.success("Medication logged");
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-400">Total Feed: <span className="font-mono font-semibold text-slate-900 dark:text-white">{totalKg.toLocaleString()} kg</span></div>
        <div className="flex gap-2">
          <button onClick={() => { setSubTab("feed"); setShowForm(true); }} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 active:scale-[0.98] transition-all"><Plus className="w-3.5 h-3.5 inline mr-1" />Feed</button>
          <button onClick={() => { setSubTab("med"); setShowForm(true); }} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:scale-[0.98] transition-all"><Plus className="w-3.5 h-3.5 inline mr-1" />Med</button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && subTab === "feed" && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={handleFeed} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="text-xs text-slate-500">Date</label><input type="date" value={feedForm.date} onChange={e => setFeedForm({ ...feedForm, date: e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /></div>
              <div><label className="text-xs text-slate-500">Type</label><select value={feedForm.feedType} onChange={e => setFeedForm({ ...feedForm, feedType: e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"><option value="starter">Starter</option><option value="grower">Grower</option><option value="finisher">Finisher</option><option value="layer_mash">Layer Mash</option></select></div>
              <div><label className="text-xs text-slate-500">Bags (50kg)</label><input type="number" min={1} value={feedForm.bags50kg} onChange={e => setFeedForm({ ...feedForm, bags50kg: +e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono" /></div>
              <div><label className="text-xs text-slate-500">Cost/Bag (KES)</label><input type="number" value={feedForm.costPerBag} onChange={e => setFeedForm({ ...feedForm, costPerBag: +e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono" /></div>
            </div>
            <button type="submit" className="mt-3 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">Save Feed Log</button>
          </motion.form>
        )}
        {showForm && subTab === "med" && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={handleMed} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div><label className="text-xs text-slate-500">Date</label><input type="date" value={medForm.date} onChange={e => setMedForm({ ...medForm, date: e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /></div>
              <div><label className="text-xs text-slate-500">Name</label><input value={medForm.name} onChange={e => setMedForm({ ...medForm, name: e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /></div>
              <div><label className="text-xs text-slate-500">Dosage</label><input value={medForm.dosage} onChange={e => setMedForm({ ...medForm, dosage: e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /></div>
              <div><label className="text-xs text-slate-500">Method</label><input value={medForm.method} onChange={e => setMedForm({ ...medForm, method: e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /></div>
              <div><label className="text-xs text-slate-500">Cost (KES)</label><input type="number" value={medForm.cost} onChange={e => setMedForm({ ...medForm, cost: +e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono" /></div>
            </div>
            <button type="submit" className="mt-3 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Save Medication</button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Feed Logs Table */}
      <div className="rounded-xl border border-slate-200/60 bg-white dark:border-slate-700/50 dark:bg-slate-800/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr><th className="text-left px-4 py-2.5 font-medium text-slate-600">Date</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Type</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Bags</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Kg</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Cost</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {feedLogs.map(f => (
              <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{f.date}</td>
                <td className="px-4 py-2.5 capitalize text-slate-700 dark:text-slate-300">{f.feedType.replace("_", " ")}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300">{f.bags50kg}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300">{f.quantityKg}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300">{(f.bags50kg * f.costPerBag).toLocaleString()}</td>
              </tr>
            ))}
            {feedLogs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No feed logs.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Med Logs */}
      {medLogs.length > 0 && (
        <div className="rounded-xl border border-slate-200/60 bg-white dark:border-slate-700/50 dark:bg-slate-800/60 overflow-hidden">
          <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-b border-slate-200 dark:border-slate-700 text-sm font-medium text-blue-800 dark:text-blue-300">Medications</div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {medLogs.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{m.date}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{m.name}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{m.dosage} | {m.method}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300">{m.cost.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Egg Collection Tab ──────────────────────────────────────────────────────
function EggTab({ batchId, batches }: { batchId: string; batches: any[] }) {
  const { data, auth, addEggCollection, activeFlockCount, layingRate } = useFarm();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), totalEggs: 100, damagedEggs: 0 });

  const logs = data.eggLogs.filter(e => e.batchId === batchId).sort((a, b) => b.date.localeCompare(a.date));
  const hens = activeFlockCount(batchId);
  const lr = layingRate(batchId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const crates = Math.floor((form.totalEggs - form.damagedEggs) / 30);
    addEggCollection({ ...form, batchId, farmId: auth.currentFarmId, crates });
    toast.success(`Logged ${form.totalEggs} eggs (${crates} crates)`);
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="text-slate-600 dark:text-slate-400">Hens: <span className="font-mono font-semibold text-slate-900 dark:text-white">{hens.toLocaleString()}</span></span>
          <span className="text-slate-600 dark:text-slate-400">Laying Rate: <span className={`font-mono font-semibold ${lr > 80 ? "text-emerald-600" : lr > 60 ? "text-amber-600" : "text-red-600"}`}>{lr.toFixed(1)}%</span></span>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 active:scale-[0.98] transition-all">
          <Plus className="w-3.5 h-3.5" /> Log Collection
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-4">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-slate-500">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /></div>
              <div><label className="text-xs text-slate-500">Total Eggs</label><input type="number" min={0} value={form.totalEggs} onChange={e => setForm({ ...form, totalEggs: +e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono" /></div>
              <div><label className="text-xs text-slate-500">Damaged</label><input type="number" min={0} value={form.damagedEggs} onChange={e => setForm({ ...form, damagedEggs: +e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono" /></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Crates: {Math.floor((form.totalEggs - form.damagedEggs) / 30)} | Laying %: {hens > 0 ? ((form.totalEggs / hens) * 100).toFixed(1) : 0}%</p>
            <button type="submit" className="mt-3 px-4 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700">Save</button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="rounded-xl border border-slate-200/60 bg-white dark:border-slate-700/50 dark:bg-slate-800/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr><th className="text-left px-4 py-2.5 font-medium text-slate-600">Date</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Total</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Damaged</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Crates</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Lay %</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{l.date}</td>
                <td className="px-4 py-2.5 font-mono text-slate-900 dark:text-white">{l.totalEggs.toLocaleString()}</td>
                <td className="px-4 py-2.5 font-mono text-red-600 dark:text-red-400">{l.damagedEggs}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300">{l.crates}</td>
                <td className="px-4 py-2.5 font-mono text-emerald-600 dark:text-emerald-400">{hens > 0 ? ((l.totalEggs / hens) * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No egg collection logs.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Weights & FCR Tab ───────────────────────────────────────────────────────
function WeightsTab({ batchId, batches }: { batchId: string; batches: any[] }) {
  const { data, auth, addWeight, fcr, totalFeedConsumed, totalWeightGained, activeFlockCount } = useFarm();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), sampleSize: 30, avgWeightKg: 0.5 });

  const logs = data.weightLogs.filter(w => w.batchId === batchId).sort((a, b) => a.date.localeCompare(b.date));
  const batch = data.batches.find(b => b.id === batchId);
  const currentFcr = fcr(batchId);
  const totalFeed = totalFeedConsumed(batchId);
  const totalGain = totalWeightGained(batchId);

  // Chart data: merge actual weights with Ross 308 benchmark
  const chartData = logs.map(l => {
    const daysSinceStart = batch ? Math.floor((new Date(l.date).getTime() - new Date(batch.startDate).getTime()) / 86400000) : 0;
    const benchmark = ROSS_308_CURVE.reduce((closest, point) => {
      return Math.abs(point.day - daysSinceStart) < Math.abs(closest.day - daysSinceStart) ? point : closest;
    }, ROSS_308_CURVE[0]);
    return { day: daysSinceStart, actual: l.avgWeightKg * 1000, target: benchmark.weight, fcr: currentFcr };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addWeight({ ...form, batchId, farmId: auth.currentFarmId });
    toast.success("Weight sample logged");
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* FCR Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3 text-center">
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Current FCR</div>
          <div className={`text-xl font-bold font-mono ${currentFcr < 1.6 ? "text-emerald-700 dark:text-emerald-300" : currentFcr < 1.85 ? "text-amber-700 dark:text-amber-300" : "text-red-700 dark:text-red-300"}`}>{currentFcr > 0 ? currentFcr.toFixed(2) : "N/A"}</div>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-center">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Total Feed</div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">{totalFeed.toLocaleString()}kg</div>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-center">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Weight Gained</div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">{totalGain.toLocaleString()}kg</div>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-center">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Active Flock</div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">{activeFlockCount(batchId).toLocaleString()}</div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 active:scale-[0.98] transition-all">
          <Plus className="w-3.5 h-3.5" /> Log Weigh-in
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-4">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-slate-500">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /></div>
              <div><label className="text-xs text-slate-500">Sample Size</label><input type="number" min={1} value={form.sampleSize} onChange={e => setForm({ ...form, sampleSize: +e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono" /></div>
              <div><label className="text-xs text-slate-500">Avg Weight (kg)</label><input type="number" step="0.01" value={form.avgWeightKg} onChange={e => setForm({ ...form, avgWeightKg: +e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono" /></div>
            </div>
            <button type="submit" className="mt-3 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">Save</button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Ross 308 Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/60">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Weight vs Ross 308 Benchmark</h4>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" label={{ value: "Days", position: "insideBottom", offset: -5 }} tick={{ fontSize: 12 }} />
              <YAxis label={{ value: "Weight (g)", angle: -90, position: "insideLeft" }} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Ross 308 Target" dot={false} />
              <Line type="monotone" dataKey="actual" stroke="#059669" strokeWidth={2.5} name="Actual" dot={{ r: 4, fill: "#059669" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weight Logs Table */}
      <div className="rounded-xl border border-slate-200/60 bg-white dark:border-slate-700/50 dark:bg-slate-800/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr><th className="text-left px-4 py-2.5 font-medium text-slate-600">Date</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Sample</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Avg Weight</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Days</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {logs.map(l => {
              const days = batch ? Math.floor((new Date(l.date).getTime() - new Date(batch.startDate).getTime()) / 86400000) : 0;
              return (
                <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{l.date}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300">{l.sampleSize}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-900 dark:text-white">{(l.avgWeightKg * 1000).toFixed(0)}g</td>
                  <td className="px-4 py-2.5 font-mono text-slate-500">D{days}</td>
                </tr>
              );
            })}
            {logs.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No weight logs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
