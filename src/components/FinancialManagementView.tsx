import { useState } from "react";
import { useFarm } from "../context/FarmContext";
import { motion } from "framer-motion";
import { Plus, X, DollarSign, TrendingUp, TrendingDown, FileDown } from "lucide-react";
import { toast } from "sonner";
import type { SaleCategory, ExpenseCategory } from "../types";

export function FinancialManagementView() {
  const { data, auth, addSale, addExpense, batchProfitLoss, costPerBird, costPerEggCrate, canViewFinancials } = useFarm();
  const [tab, setTab] = useState<"sales" | "expenses" | "pnl">("pnl");
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);

  const batches = data.batches.filter(b => b.farmId === auth.currentFarmId);
  const [selBatch, setSelBatch] = useState(batches[0]?.id || "");

  const sales = data.sales.filter(s => s.farmId === auth.currentFarmId).sort((a, b) => b.date.localeCompare(a.date));
  const expenses = data.expenses.filter(e => e.farmId === auth.currentFarmId).sort((a, b) => b.date.localeCompare(a.date));

  if (!canViewFinancials) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400">
        <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="font-medium">Access Restricted</p>
        <p className="text-sm mt-1">Only Owners and Managers can view financial records.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Financial Management</h2>
        <select value={selBatch} onChange={e => setSelBatch(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
          <option value="">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 w-fit">
        {(["pnl", "sales", "expenses"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
            {t === "pnl" ? "P&L Statement" : t === "sales" ? "Sales" : "Expenses"}
          </button>
        ))}
      </div>

      {tab === "pnl" && <PnLView batchId={selBatch || undefined} />}
      {tab === "sales" && <SalesView sales={sales} showForm={showSaleForm} setShowForm={setShowSaleForm} selBatch={selBatch} addSale={addSale} farmId={auth.currentFarmId} />}
      {tab === "expenses" && <ExpensesView expenses={expenses} showForm={showExpForm} setShowForm={setShowExpForm} selBatch={selBatch} addExpense={addExpense} farmId={auth.currentFarmId} />}
    </div>
  );
}

// ─── P&L View ────────────────────────────────────────────────────────────────
function PnLView({ batchId }: { batchId?: string }) {
  const { data, auth, batchProfitLoss, costPerBird, costPerEggCrate, activeFlockCount } = useFarm();
  const batches = data.batches.filter(b => b.farmId === auth.currentFarmId);
  const filtered = batchId ? batches.filter(b => b.id === batchId) : batches;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(b => {
          const pl = batchProfitLoss(b.id);
          const birds = activeFlockCount(b.id);
          const cpb = costPerBird(b.id);
          const cpc = b.type === "layer" ? costPerEggCrate(b.id) : 0;
          return (
            <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200/60 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-900 dark:text-white">{b.name}</h4>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${b.type === "broiler" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>{b.type}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Gross Revenue</span><span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">KES {pl.revenue.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">COGS</span><span className="font-mono text-red-600 dark:text-red-400">KES {pl.cogs.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">OpEx</span><span className="font-mono text-red-600 dark:text-red-400">KES {pl.opex.toLocaleString()}</span></div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Net Profit/Loss</span>
                  <span className={`font-mono font-bold ${pl.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>KES {pl.net.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-700/50 pt-2 grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-500">Cost/Bird</span><div className="font-mono font-semibold text-slate-900 dark:text-white">KES {cpb.toLocaleString()}</div></div>
                  {b.type === "layer" && <div><span className="text-slate-500">Cost/Crate</span><div className="font-mono font-semibold text-slate-900 dark:text-white">KES {cpc.toLocaleString()}</div></div>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-slate-500">No batches to report on.</div>}
    </div>
  );
}

// ─── Sales View ──────────────────────────────────────────────────────────────
function SalesView({ sales, showForm, setShowForm, selBatch, addSale, farmId }: any) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: "live_birds" as SaleCategory, quantity: 100, unitPrice: 450, batchId: selBatch || "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSale({ ...form, farmId, total: form.quantity * form.unitPrice });
    toast.success("Sale recorded");
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 active:scale-[0.98] transition-all">
          <Plus className="w-3.5 h-3.5" /> Record Sale
        </button>
      </div>

      {showForm && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><label className="text-xs text-slate-500">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /></div>
            <div><label className="text-xs text-slate-500">Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as SaleCategory })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"><option value="live_birds">Live Birds</option><option value="dressed_meat">Dressed Meat</option><option value="manure">Manure</option><option value="cull_hens">Cull Hens</option><option value="egg_crates">Egg Crates</option></select></div>
            <div><label className="text-xs text-slate-500">Quantity</label><input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: +e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono" /></div>
            <div><label className="text-xs text-slate-500">Unit Price (KES)</label><input type="number" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: +e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono" /></div>
            <div><label className="text-xs text-slate-500">Batch</label><select value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"><option value="">Select...</option>{sales.length > 0 && <option value={form.batchId}>Current</option>}</select></div>
          </div>
          <button type="submit" className="mt-3 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">Save Sale</button>
        </motion.form>
      )}

      <div className="rounded-xl border border-slate-200/60 bg-white dark:border-slate-700/50 dark:bg-slate-800/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr><th className="text-left px-4 py-2.5 font-medium text-slate-600">Date</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Category</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Qty</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Unit</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {sales.map((s: any) => (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{s.date}</td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 capitalize">{s.category.replace("_", " ")}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300">{s.quantity.toLocaleString()}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300">{s.unitPrice.toLocaleString()}</td>
                <td className="px-4 py-2.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{s.total.toLocaleString()}</td>
              </tr>
            ))}
            {sales.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No sales records.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Expenses View ───────────────────────────────────────────────────────────
function ExpensesView({ expenses, showForm, setShowForm, selBatch, addExpense, farmId }: any) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: "feed" as ExpenseCategory, description: "", amount: 0, batchId: selBatch || "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addExpense({ ...form, farmId });
    toast.success("Expense recorded");
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 active:scale-[0.98] transition-all">
          <Plus className="w-3.5 h-3.5" /> Record Expense
        </button>
      </div>

      {showForm && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="text-xs text-slate-500">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /></div>
            <div><label className="text-xs text-slate-500">Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as ExpenseCategory })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"><option value="feed">Feed</option><option value="day_old_chicks">Day-Old Chicks</option><option value="vet_vaccines">Vet/Vaccines</option><option value="utilities">Utilities</option><option value="labor">Labor</option><option value="housing">Housing</option><option value="bedding">Bedding</option></select></div>
            <div><label className="text-xs text-slate-500">Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /></div>
            <div><label className="text-xs text-slate-500">Amount (KES)</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono" /></div>
          </div>
          <button type="submit" className="mt-3 px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">Save Expense</button>
        </motion.form>
      )}

      <div className="rounded-xl border border-slate-200/60 bg-white dark:border-slate-700/50 dark:bg-slate-800/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr><th className="text-left px-4 py-2.5 font-medium text-slate-600">Date</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Category</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Description</th><th className="text-left px-4 py-2.5 font-medium text-slate-600">Amount</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {expenses.map((e: any) => (
              <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{e.date}</td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 capitalize">{e.category.replace("_", " ")}</td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{e.description}</td>
                <td className="px-4 py-2.5 font-mono font-semibold text-red-600 dark:text-red-400">{e.amount.toLocaleString()}</td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No expense records.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
