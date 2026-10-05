import { useRef } from "react";
import {
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  FEED_UNIT_OPTIONS,
  TIMEZONE_OPTIONS,
  WEIGHT_UNIT_OPTIONS,
  type FarmSettings,
} from "@/types";
import { readFileAsDataUrl } from "@/services/settingsService";
import {
  NumberField,
  SectionCard,
  SelectField,
  TagInput,
  TextField,
} from "@/components/settings/SettingsPrimitives";
import { Bell, Building2, Globe, Upload } from "lucide-react";

export interface TabProps {
  settings: FarmSettings;
  update: (patch: Partial<FarmSettings>) => void;
}

export function ProfileBrandingTab({ settings, update }: TabProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await readFileAsDataUrl(f);
      update({ logoUrl: url });
    } catch {
      /* ignore unreadable file */
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Branding"
        description="Your farm logo and identity shown across reports and the console."
        icon={<Building2 className="size-5" />}
      >
        <div className="flex items-center gap-4">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Farm logo"
                className="size-full object-cover"
              />
            ) : (
              <Building2 className="size-7 text-slate-300 dark:text-slate-600" />
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Upload className="size-4" />
              Upload logo
            </button>
            {settings.logoUrl ? (
              <button
                type="button"
                onClick={() => update({ logoUrl: "" })}
                className="block text-xs text-slate-500 hover:text-red-600 dark:text-slate-400"
              >
                Remove logo
              </button>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Farm Profile"
        description="Legal and contact details for this farm."
        icon={<Building2 className="size-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Farm name"
            value={settings.farmName}
            onChange={(v) => update({ farmName: v })}
            placeholder="GreenPasture Poultry"
          />
          <TextField
            label="Registration number"
            value={settings.registrationNumber}
            onChange={(v) => update({ registrationNumber: v })}
            placeholder="RC-000000"
          />
          <TextField
            label="Contact email"
            type="email"
            value={settings.contactEmail}
            onChange={(v) => update({ contactEmail: v })}
            placeholder="hello@farm.com"
          />
          <TextField
            label="Contact phone"
            type="tel"
            value={settings.contactPhone}
            onChange={(v) => update({ contactPhone: v })}
            placeholder="+234 800 000 0000"
          />
          <div className="sm:col-span-2">
            <TextField
              label="Physical address"
              value={settings.physicalAddress}
              onChange={(v) => update({ physicalAddress: v })}
              placeholder="Plot 12, Farm Road, City"
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export function OperationsAlertsTab({ settings, update }: TabProps) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Mortality Thresholds"
        description="Daily mortality rate that triggers a warning or critical alert on the dashboard."
        icon={<Bell className="size-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Warning threshold"
            value={settings.mortalityWarningPct}
            onChange={(v) => update({ mortalityWarningPct: v })}
            step={0.1}
            min={0}
            suffix="%"
            hint="Amber alert when daily mortality exceeds this."
          />
          <NumberField
            label="Critical threshold"
            value={settings.mortalityCriticalPct}
            onChange={(v) => update({ mortalityCriticalPct: v })}
            step={0.1}
            min={0}
            suffix="%"
            hint="Red alert when daily mortality exceeds this."
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Feed Conversion Targets"
        description="Target FCR benchmarks used to grade batch performance."
        icon={<Bell className="size-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Broiler target FCR"
            value={settings.broilerTargetFcr}
            onChange={(v) => update({ broilerTargetFcr: v })}
            step={0.05}
            min={0}
          />
          <NumberField
            label="Layer target FCR"
            value={settings.layerTargetFcr}
            onChange={(v) => update({ layerTargetFcr: v })}
            step={0.05}
            min={0}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Flock Strains"
        description="Breeds available when creating a new batch."
        icon={<Bell className="size-5" />}
      >
        <TagInput
          label="Strains"
          tags={settings.flockStrains}
          onChange={(v) => update({ flockStrains: v })}
          placeholder="e.g. Ross 308"
        />
      </SectionCard>
    </div>
  );
}

export function UnitsLocalizationTab({ settings, update }: TabProps) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Measurement Units"
        description="Units applied to weights, feed and egg crates across the app."
        icon={<Globe className="size-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Currency"
            value={settings.currency}
            onChange={(v) => update({ currency: v })}
            options={CURRENCY_OPTIONS}
          />
          <SelectField
            label="Weight unit"
            value={settings.weightUnit}
            onChange={(v) => update({ weightUnit: v })}
            options={WEIGHT_UNIT_OPTIONS}
          />
          <SelectField
            label="Feed unit"
            value={settings.feedUnit}
            onChange={(v) => update({ feedUnit: v })}
            options={FEED_UNIT_OPTIONS}
          />
          <NumberField
            label="Eggs per crate"
            value={settings.crateCapacity}
            onChange={(v) => update({ crateCapacity: v })}
            step={1}
            min={1}
            suffix="eggs"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Time & Date"
        description="Timezone and date format used for logs and reports."
        icon={<Globe className="size-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Timezone"
            value={settings.timezone}
            onChange={(v) => update({ timezone: v })}
            options={TIMEZONE_OPTIONS}
          />
          <SelectField
            label="Date format"
            value={settings.dateFormat}
            onChange={(v) => update({ dateFormat: v })}
            options={DATE_FORMAT_OPTIONS}
          />
        </div>
      </SectionCard>
    </div>
  );
}
