"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";

type MealPeriod = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

type Settings = {
  schoolName: string;
  cafeteriaName: string;
  timezone: string;
  diningArea: string;
  mealPeriods: MealPeriod[];
};

const defaultSettings: Settings = {
  schoolName: "Kingsway College",
  cafeteriaName: "Main cafeteria",
  timezone: "America/Toronto",
  diningArea: "Main hall",
  mealPeriods: [
    { id: "breakfast", name: "Breakfast", startsAt: "06:30", endsAt: "10:00" },
    { id: "lunch", name: "Lunch", startsAt: "11:30", endsAt: "14:30" },
    { id: "dinner", name: "Dinner", startsAt: "17:00", endsAt: "20:30" },
  ],
};

export function SchoolSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(async (response) => {
        const payload = (await response.json()) as Settings & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Settings could not be loaded.");
        setSettings(payload);
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");

    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const payload = (await response.json()) as { saved?: boolean; error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(payload.error || "Settings could not be saved.");
      return;
    }

    setSaved(true);
  }

  function updateField<K extends keyof Omit<Settings, "mealPeriods">>(
    field: K,
    value: Settings[K],
  ) {
    setSettings((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function updateMeal(id: string, field: "startsAt" | "endsAt", value: string) {
    setSettings((current) => ({
      ...current,
      mealPeriods: current.mealPeriods.map((period) =>
        period.id === id ? { ...period, [field]: value } : period,
      ),
    }));
    setSaved(false);
  }

  return (
    <div className="mx-auto max-w-4xl p-5 sm:p-8 lg:p-10">
      <p className="text-sm font-semibold text-tomato">Workspace configuration</p>
      <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
        School settings
      </h1>
      <p className="mt-2 text-ink/50">
        These values control the student experience and automatic meal detection.
      </p>

      <form onSubmit={save} className="mt-8 rounded-3xl border border-ink/8 bg-white p-6 shadow-sm sm:p-8">
        {loading ? (
          <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-ink/50">
            <LoaderCircle size={17} className="animate-spin" /> Loading saved settings…
          </div>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold">
            School name
            <input
              name="schoolName"
              value={settings.schoolName}
              onChange={(event) => updateField("schoolName", event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-ink/10 px-4 font-normal outline-none focus:border-moss"
            />
          </label>
          <label className="text-sm font-bold">
            Cafeteria name
            <input
              name="cafeteriaName"
              value={settings.cafeteriaName}
              onChange={(event) => updateField("cafeteriaName", event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-ink/10 px-4 font-normal outline-none focus:border-moss"
            />
          </label>
          <label className="text-sm font-bold">
            Timezone
            <select
              name="timezone"
              value={settings.timezone}
              onChange={(event) => updateField("timezone", event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-ink/10 bg-white px-4 font-normal outline-none focus:border-moss"
            >
              <option value="America/Toronto">Eastern Time — Toronto</option>
              <option value="America/Chicago">Central Time — Chicago</option>
              <option value="America/Denver">Mountain Time — Denver</option>
              <option value="America/Los_Angeles">Pacific Time — Los Angeles</option>
              <option value="America/Sao_Paulo">Brasília Time — São Paulo</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            Default dining area
            <input
              name="diningArea"
              value={settings.diningArea}
              onChange={(event) => updateField("diningArea", event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-ink/10 px-4 font-normal outline-none focus:border-moss"
            />
          </label>
        </div>

        <h2 className="mt-8 text-xl font-bold">Meal windows</h2>
        <p className="mt-1 text-sm text-ink/45">
          A tag link opens the menu whose window contains the current school time.
        </p>
        <div className="mt-5 space-y-3">
          {settings.mealPeriods.map((period) => (
            <div key={period.id} className="grid gap-3 rounded-2xl bg-[#f8f6f7] p-4 sm:grid-cols-[1fr_140px_140px] sm:items-center">
              <p className="font-bold">{period.name}</p>
              <input
                type="time"
                aria-label={period.name + " start time"}
                value={period.startsAt}
                onChange={(event) => updateMeal(period.id, "startsAt", event.target.value)}
                className="h-10 rounded-xl border border-ink/10 bg-white px-3"
              />
              <input
                type="time"
                aria-label={period.name + " end time"}
                value={period.endsAt}
                onChange={(event) => updateMeal(period.id, "endsAt", event.target.value)}
                className="h-10 rounded-xl border border-ink/10 bg-white px-3"
              />
            </div>
          ))}
        </div>
        {error ? (
          <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <button
          disabled={loading || saving}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 font-bold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <LoaderCircle size={17} className="animate-spin" />}
          {saved && <Check size={17} />}
          {saving ? "Saving…" : saved ? "Settings saved" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
