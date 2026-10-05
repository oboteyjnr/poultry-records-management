import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useFarm } from "../../context/FarmContext";
import type { BatchFinancials } from "../../context/FarmContext";
import type { Batch } from "../../types";

export type SortKey =
  | "net"
  | "revenue"
  | "totalCost"
  | "margin"
  | "roi"
  | "costPerBird"
  | "feedCostPerKg"
  | "mortalityRate";

export interface AnalyticsRow {
  batch: Batch;
  f: BatchFinancials;
}

export interface AnalyticsTotals {
  revenue: number;
  cost: number;
  net: number;
  birds: number;
  feed: number;
  stock: number;
  vet: number;
  indirect: number;
  mortality: number;
  mortalityLoss: number;
  margin: number;
  roi: number;
}

/** Rounded thousands-separated number for compact financial display. */
export const money = (n: number) => Math.round(n).toLocaleString();

export const csvCell = (v: unknown): string => {
  const s = String(v ?? "");
  const q = String.fromCharCode(34);
  const needs =
    s.indexOf(",") >= 0 || s.indexOf(q) >= 0 || s.indexOf(String.fromCharCode(10)) >= 0;
  return needs ? q + s.split(q).join(q + q) + q : s;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const quarterOf = (d: string): string => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "Undated";
  return `${dt.getFullYear()} Q${Math.floor(dt.getMonth() / 3) + 1}`;
};

/**
 * Aggregates every batch of the active farm into comparison rows, portfolio
 * totals and seasonality series, and exposes CSV / print-to-PDF exporters.
 * All figures are derived from the FarmContext batchFinancials roll-up.
 */
export function useBatchAnalytics() {
  const { data, auth, currentFarm, settings, batchFinancials } = useFarm();
  const [sortKey, setSortKey] = useState<SortKey>("net");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const farmId = auth.currentFarmId;
  const cur = settings.currency;

  const farmBatches = useMemo(
    () => data.batches.filter((b) => b.farmId === farmId),
    [data.batches, farmId],
  );
  const farmSales = useMemo(() => data.sales.filter((s) => s.farmId === farmId), [data.sales, farmId]);
  const farmExpenses = useMemo(
    () => data.expenses.filter((e) => e.farmId === farmId),
    [data.expenses, farmId],
  );
  const farmFeed = useMemo(
    () => data.feedLogs.filter((f) => f.farmId === farmId),
    [data.feedLogs, farmId],
  );
  const farmMed = useMemo(
    () => data.medicationLogs.filter((m) => m.farmId === farmId),
    [data.medicationLogs, farmId],
  );

  const rows = useMemo<AnalyticsRow[]>(() => {
    const list = farmBatches.map((b) => ({ batch: b, f: batchFinancials(b.id) }));
    const pick = (r: AnalyticsRow) =>
      sortKey === "revenue"
        ? r.f.revenue
        : sortKey === "totalCost"
          ? r.f.totalCost
          : sortKey === "margin"
            ? r.f.margin
            : sortKey === "roi"
              ? r.f.roi
              : sortKey === "costPerBird"
                ? r.f.costPerBird
                : sortKey === "feedCostPerKg"
                  ? r.f.feedCostPerKg
                  : sortKey === "mortalityRate"
                    ? r.f.mortalityRate
                    : r.f.net;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => (pick(a) - pick(b)) * dir);
  }, [farmBatches, batchFinancials, sortKey, sortDir]);

  const totals = useMemo<AnalyticsTotals>(() => {
    const t = rows.reduce(
      (acc, r) => {
        acc.revenue += r.f.revenue;
        acc.cost += r.f.totalCost;
        acc.net += r.f.net;
        acc.birds += r.f.birds;
        acc.feed += r.f.feedCost;
        acc.stock += r.f.stockCost;
        acc.vet += r.f.vetMedCost;
        acc.indirect += r.f.indirectCost;
        acc.mortality += r.f.mortalityCount;
        acc.mortalityLoss += r.f.mortalityLoss;
        return acc;
      },
      {
        revenue: 0,
        cost: 0,
        net: 0,
        birds: 0,
        feed: 0,
        stock: 0,
        vet: 0,
        indirect: 0,
        mortality: 0,
        mortalityLoss: 0,
      },
    );
    return {
      ...t,
      margin: t.revenue > 0 ? (t.net / t.revenue) * 100 : 0,
      roi: t.cost > 0 ? (t.net / t.cost) * 100 : 0,
    };
  }, [rows]);

  const best = rows.reduce<AnalyticsRow | null>((b, r) => (!b || r.f.net > b.f.net ? r : b), null);
  const worst = rows.reduce<AnalyticsRow | null>((b, r) => (!b || r.f.net < b.f.net ? r : b), null);

  const season = useMemo(() => {
    const m = new Map<string, { period: string; revenue: number; cost: number; net: number }>();
    const get = (k: string) => {
      let v = m.get(k);
      if (!v) {
        v = { period: k, revenue: 0, cost: 0, net: 0 };
        m.set(k, v);
      }
      return v;
    };
    farmSales.forEach((s) => {
      get(quarterOf(s.date)).revenue += s.total;
    });
    farmExpenses.forEach((e) => {
      get(quarterOf(e.date)).cost += e.amount;
    });
    farmFeed.forEach((f) => {
      get(quarterOf(f.date)).cost += f.bags50kg * f.costPerBag;
    });
    farmMed.forEach((x) => {
      get(quarterOf(x.date)).cost += x.cost;
    });
    return [...m.values()]
      .map((r) => ({ ...r, net: r.revenue - r.cost }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [farmSales, farmExpenses, farmFeed, farmMed]);

  const costComposition = useMemo(
    () =>
      [
        { label: "Feed", value: totals.feed, color: "bg-emerald-500" },
        { label: "Chicks & stock", value: totals.stock, color: "bg-teal-500" },
        { label: "Vet & medication", value: totals.vet, color: "bg-amber-500" },
        { label: "Indirect / overheads", value: totals.indirect, color: "bg-slate-400" },
      ].sort((a, b) => b.value - a.value),
    [totals],
  );

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const downloadCsv = () => {
    const header = [
      "Rank",
      "Batch",
      "Type",
      "Status",
      "Birds",
      `${cur} Revenue`,
      `${cur} Feed Cost`,
      `${cur} Stock Cost`,
      `${cur} Vet/Med`,
      `${cur} Indirect`,
      `${cur} Total Cost`,
      `${cur} Net Profit`,
      "Margin %",
      "ROI %",
      "Feed Cost/kg",
      "Cost/Bird",
      "Mortality %",
      `${cur} Mortality Loss`,
    ];
    const body = rows.map((r, i) =>
      [
        i + 1,
        r.batch.name,
        r.batch.type,
        r.batch.status,
        r.f.birds,
        Math.round(r.f.revenue),
        Math.round(r.f.feedCost),
        Math.round(r.f.stockCost),
        Math.round(r.f.vetMedCost),
        Math.round(r.f.indirectCost),
        Math.round(r.f.totalCost),
        Math.round(r.f.net),
        r.f.margin.toFixed(1),
        r.f.roi.toFixed(1),
        r.f.feedCostPerKg.toFixed(2),
        r.f.costPerBird.toFixed(1),
        r.f.mortalityRate.toFixed(2),
        Math.round(r.f.mortalityLoss),
      ]
        .map(csvCell)
        .join(","),
    );
    const csv = [header.map(csvCell).join(","), ...body].join(String.fromCharCode(10));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-financials-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV report downloaded");
  };

  const printReport = () => {
    const w = window.open("", "_blank", "width=1000,height=1200");
    if (!w) {
      toast.error("Enable pop-ups to export the PDF report");
      return;
    }
    const bodyRows = rows
      .map(
        (r, i) =>
          "<tr><td>" +
          (i + 1) +
          "</td><td>" +
          escapeHtml(r.batch.name) +
          "</td><td>" +
          escapeHtml(r.batch.type) +
          "</td><td class='n'>" +
          money(r.f.revenue) +
          "</td><td class='n'>" +
          money(r.f.totalCost) +
          "</td><td class='n'>" +
          money(r.f.net) +
          "</td><td class='n'>" +
          r.f.margin.toFixed(1) +
          "</td><td class='n'>" +
          r.f.roi.toFixed(1) +
          "</td><td class='n'>" +
          r.f.mortalityRate.toFixed(2) +
          "</td></tr>",
      )
      .join("");
    const html =
      "<!doctype html><html><head><meta charset='utf-8'><title>Batch Financial Report</title>" +
      "<style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#0f172a;padding:32px}" +
      "h1{font-size:20px;margin:0 0 4px}.muted{color:#64748b;font-size:12px;margin-bottom:20px}" +
      ".kpis{display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap}" +
      ".kpis div{border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;min-width:150px}" +
      ".kpis b{display:block;font-size:18px;margin-top:4px}" +
      ".kpis span{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b}" +
      "table{width:100%;border-collapse:collapse;font-size:12px}" +
      "th,td{border-bottom:1px solid #e2e8f0;padding:7px 8px;text-align:left}" +
      "th{background:#f1f5f9;font-weight:600}.n{text-align:right;font-variant-numeric:tabular-nums}</style></head><body>" +
      "<h1>" +
      escapeHtml(currentFarm.name) +
      " - Batch Financial Report</h1>" +
      "<p class='muted'>Currency: " +
      escapeHtml(cur) +
      " &middot; Generated " +
      new Date().toLocaleString() +
      " &middot; " +
      rows.length +
      " batches</p>" +
      "<div class='kpis'>" +
      "<div><span>Revenue</span><b>" +
      money(totals.revenue) +
      "</b></div>" +
      "<div><span>Total cost</span><b>" +
      money(totals.cost) +
      "</b></div>" +
      "<div><span>Net profit</span><b>" +
      money(totals.net) +
      "</b></div>" +
      "<div><span>Avg margin</span><b>" +
      totals.margin.toFixed(1) +
      "%</b></div>" +
      "<div><span>Avg ROI</span><b>" +
      totals.roi.toFixed(1) +
      "%</b></div></div>" +
      "<table><thead><tr><th>#</th><th>Batch</th><th>Type</th><th class='n'>Revenue</th>" +
      "<th class='n'>Cost</th><th class='n'>Net</th><th class='n'>Margin %</th>" +
      "<th class='n'>ROI %</th><th class='n'>Mortality %</th></tr></thead><tbody>" +
      bodyRows +
      "</tbody></table></body></html>";
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    toast.success("Report ready - choose Save as PDF");
  };

  return {
    cur,
    currentFarm,
    settings,
    rows,
    totals,
    best,
    worst,
    season,
    costComposition,
    sortKey,
    sortDir,
    toggleSort,
    downloadCsv,
    printReport,
  };
}