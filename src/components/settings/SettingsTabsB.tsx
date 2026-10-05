import { FEED_COST_LABELS, type FarmSettings, type FeedCostKey } from "@/types";
import {
  NumberField,
  SectionCard,
  TagInput,
  ToggleRow,
} from "@/components/settings/SettingsPrimitives";
import { ShieldCheck, Wallet } from "lucide-react";
import type { TabProps } from "@/components/settings/SettingsTabsA";

export function RolesPermissionsTab({ settings, update }: TabProps) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Access Rules"
        description="Control what staff and managers can see and do."
        icon={<ShieldCheck className="size-5" />}
      >
        <div className="space-y-3">
          <ToggleRow
            label="Allow workers to view financials"
            description="When off, only owners and managers see revenue and cost data."
            checked={settings.allowWorkerFinancials}
            onChange={(v) => update({ allowWorkerFinancials: v })}
          />
          <ToggleRow
            label="Allow managers to view financial analytics"
            description="Owners always have access. Turn this on to let managers open the Batch Financial Analytics module."
            checked={settings.allowManagersViewFinancials}
            onChange={(v) => update({ allowManagersViewFinancials: v })}
          />
          <ToggleRow
            label="Require manager approval for expenses"
            description="Expenses above the threshold are flagged for review before posting."
            checked={settings.requireExpenseApproval}
            onChange={(v) => update({ requireExpenseApproval: v })}
          />
          <div className="pt-1">
            <NumberField
              label="Expense approval threshold"
              value={settings.expenseApprovalThreshold}
              onChange={(v) => update({ expenseApprovalThreshold: v })}
              step={1000}
              min={0}
              suffix={settings.currency}
              hint={
                settings.requireExpenseApproval
                  ? "Expenses over this amount need approval."
                  : "Approval is currently disabled."
              }
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Role Matrix"
        description="Default capability map for the three farm roles."
        icon={<ShieldCheck className="size-5" />}
      >
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">Capability</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Manager</th>
                <th className="px-3 py-2 font-medium">Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {[
                ["View dashboard & logs", true, true, true],
                ["Edit batches", true, true, false],
                ["View financials", true, true, settings.allowWorkerFinancials],
                ["View batch analytics", true, settings.allowManagersViewFinancials, false],
                ["Farm settings", true, false, false],
              ].map((row) => (
                <tr key={String(row[0])}>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                    {String(row[0])}
                  </td>
                  {row.slice(1).map((can, i) => (
                    <td key={i} className="px-3 py-2">
                      <span
                        className={
                          can
                            ? "font-medium text-emerald-600 dark:text-emerald-400"
                            : "text-slate-300 dark:text-slate-600"
                        }
                      >
                        {can ? "Yes" : "No"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

export function AccountingCategoriesTab({ settings, update }: TabProps) {
  const setCost = (key: FeedCostKey, value: number) =>
    update({ feedUnitCosts: { ...settings.feedUnitCosts, [key]: value } });

  return (
    <div className="space-y-6">
      <SectionCard
        title="Revenue Categories"
        description="Income streams available when logging a sale."
        icon={<Wallet className="size-5" />}
      >
        <TagInput
          label="Revenue categories"
          tags={settings.revenueCategories}
          onChange={(v) => update({ revenueCategories: v })}
          placeholder="e.g. Live Birds"
        />
      </SectionCard>

      <SectionCard
        title="Expense Categories"
        description="Cost buckets available when logging an expense."
        icon={<Wallet className="size-5" />}
      >
        <TagInput
          label="Expense categories"
          tags={settings.expenseCategories}
          onChange={(v) => update({ expenseCategories: v })}
          placeholder="e.g. Feed"
        />
      </SectionCard>

      <SectionCard
        title="Feed Unit Costs"
        description={`Default cost per bag of feed, in ${settings.currency}.`}
        icon={<Wallet className="size-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {FEED_COST_LABELS.map(({ key, label }) => (
            <NumberField
              key={key}
              label={label}
              value={settings.feedUnitCosts[key]}
              onChange={(v) => setCost(key, v)}
              step={50}
              min={0}
              suffix={settings.currency}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}