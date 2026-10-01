"use client";

import { FormEvent, useState } from "react";
import { Check } from "lucide-react";

export function SchoolSettings() {
  const [saved, setSaved] = useState(false);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    localStorage.setItem("nourish-school-settings", JSON.stringify(values));
    setSaved(true);
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
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold">
            School name
            <input
              name="schoolName"
              defaultValue="Greenwood School"
              className="mt-2 h-12 w-full rounded-xl border border-ink/10 px-4 font-normal outline-none focus:border-moss"
            />
          </label>
          <label className="text-sm font-bold">
            Cafeteria name
            <input
              name="cafeteriaName"
              defaultValue="Main cafeteria"
              className="mt-2 h-12 w-full rounded-xl border border-ink/10 px-4 font-normal outline-none focus:border-moss"
            />
          </label>
          <label className="text-sm font-bold">
            Timezone
            <select
              name="timezone"
              defaultValue="America/Toronto"
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
              defaultValue="Main hall"
              className="mt-2 h-12 w-full rounded-xl border border-ink/10 px-4 font-normal outline-none focus:border-moss"
            />
          </label>
        </div>

        <h2 className="mt-8 text-xl font-bold">Meal windows</h2>
        <p className="mt-1 text-sm text-ink/45">
          A tag link opens the menu whose window contains the current school time.
        </p>
        <div className="mt-5 space-y-3">
          {[
            ["Breakfast", "06:30", "10:00"],
            ["Lunch", "11:30", "14:30"],
            ["Dinner", "17:00", "20:30"],
          ].map(([name, start, end]) => (
            <div key={name} className="grid gap-3 rounded-2xl bg-cream/50 p-4 sm:grid-cols-[1fr_140px_140px] sm:items-center">
              <p className="font-bold">{name}</p>
              <input
                name={name.toLowerCase() + "Start"}
                type="time"
                defaultValue={start}
                className="h-10 rounded-xl border border-ink/10 bg-white px-3"
              />
              <input
                name={name.toLowerCase() + "End"}
                type="time"
                defaultValue={end}
                className="h-10 rounded-xl border border-ink/10 bg-white px-3"
              />
            </div>
          ))}
        </div>
        <button className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 font-bold text-white hover:bg-moss">
          {saved && <Check size={17} />}
          {saved ? "Settings saved" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
