"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Plus, QrCode, X } from "lucide-react";
import QRCode from "qrcode";

type CafeteriaTable = {
  id: string;
  tableNumber: number;
  tagCode: string;
  area: string;
  active: boolean;
};

const initialTables: CafeteriaTable[] = [
  { id: "table-14", tableNumber: 14, tagCode: "tag14", area: "Main hall", active: true },
  { id: "table-15", tableNumber: 15, tagCode: "tag15", area: "Main hall", active: true },
  { id: "table-21", tableNumber: 21, tagCode: "tag21", area: "Window area", active: true },
];

export function TableTagManager() {
  const [tables, setTables] = useState(initialTables);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState("");
  const [downloadingQr, setDownloadingQr] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      fetch("/api/admin/tables")
        .then((response) => response.json())
        .then((payload: { tables?: CafeteriaTable[] }) => {
          if (payload.tables) setTables(payload.tables);
        })
        .catch(() => undefined);
      return;
    }
    const saved = localStorage.getItem("nourish-cafeteria-tables");
    if (saved) {
      const frame = window.requestAnimationFrame(() =>
        setTables(JSON.parse(saved) as CafeteriaTable[]),
      );
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  function persist(next: CafeteriaTable[]) {
    setTables(next);
    localStorage.setItem("nourish-cafeteria-tables", JSON.stringify(next));
  }

  async function createTable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const tableNumber = Number(data.get("tableNumber"));
    const tagCode = String(data.get("tagCode") || "").trim().toLowerCase();
    const area = String(data.get("area") || "").trim();

    if (!Number.isInteger(tableNumber) || tableNumber < 1) {
      setFormError("Enter a valid table number.");
      return;
    }
    if (!/^[a-z0-9_-]{3,64}$/.test(tagCode)) {
      setFormError("Tag IDs can only use lowercase letters, numbers, dashes, and underscores.");
      return;
    }
    if (tables.some((table) => table.tagCode === tagCode)) {
      setFormError("This tag ID is already in use.");
      return;
    }
    if (tables.some((table) => table.tableNumber === tableNumber)) {
      setFormError("This table number is already in use.");
      return;
    }

    let createdTable: CafeteriaTable = {
      id: crypto.randomUUID(),
      tableNumber,
      tagCode,
      area: area || "Main hall",
      active: true,
    };

    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      const response = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createdTable),
      });
      const payload = (await response.json()) as {
        table?: CafeteriaTable;
        error?: string;
      };
      if (!response.ok || !payload.table) {
        setFormError(payload.error || "The table tag could not be created.");
        return;
      }
      createdTable = payload.table;
    }

    persist([
      ...tables,
      createdTable,
    ]);
    formElement.reset();
    setFormError("");
    setShowForm(false);
  }

  async function copyLink(tagCode: string) {
    const link = window.location.origin + "/site/rate/" + tagCode;
    await navigator.clipboard.writeText(link);
    setCopied(tagCode);
    window.setTimeout(() => setCopied(""), 1800);
  }

  async function downloadQrCode(table: CafeteriaTable) {
    setDownloadingQr(table.id);
    setDownloadError("");
    try {
      const link = window.location.origin + "/site/rate/" + table.tagCode;
      const dataUrl = await QRCode.toDataURL(link, {
        width: 1024,
        margin: 3,
        errorCorrectionLevel: "H",
        color: {
          dark: "#85001D",
          light: "#FFFFFF",
        },
      });
      const download = document.createElement("a");
      download.href = dataUrl;
      download.download = `mealup-table-${table.tableNumber}-${table.tagCode}.png`;
      document.body.appendChild(download);
      download.click();
      download.remove();
    } catch {
      setDownloadError("The QR code could not be generated. Please try again.");
    } finally {
      setDownloadingQr("");
    }
  }

  async function toggleTable(table: CafeteriaTable) {
    const nextActive = !table.active;
    const next = tables.map((item) =>
      item.id === table.id ? { ...item, active: nextActive } : item,
    );
    persist(next);

    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      const response = await fetch("/api/admin/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: table.id, active: nextActive }),
      });
      if (!response.ok) persist(tables);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] p-5 sm:p-8 lg:p-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-tomato">Cafeteria access points</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
            Tables & tags
          </h1>
          <p className="mt-2 max-w-2xl text-ink/50">
            Every NFC tag and QR code has a unique ID linked to one table. You
            control both the table number and its public link.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white hover:bg-moss"
        >
          <Plus size={17} /> Create table tag
        </button>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-ink/8 bg-white shadow-sm">
        <div className="hidden grid-cols-[100px_1fr_1fr_120px_180px] gap-4 border-b border-ink/8 bg-cream/55 px-6 py-4 text-xs font-bold uppercase tracking-[.12em] text-ink/45 md:grid">
          <span>Table</span>
          <span>Tag ID</span>
          <span>Area</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-ink/8">
          {tables.map((table) => (
            <article
              key={table.id}
              className="grid gap-4 px-5 py-5 md:grid-cols-[100px_1fr_1fr_120px_180px] md:items-center md:px-6"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-moss text-sm font-bold text-white">
                  {table.tableNumber}
                </span>
                <span className="text-xs text-ink/40 md:hidden">Table</span>
              </div>
              <div>
                <p className="font-mono text-sm font-bold">{table.tagCode}</p>
                <p className="mt-1 truncate text-xs text-ink/35">
                  /site/rate/{table.tagCode}
                </p>
              </div>
              <p className="text-sm font-medium">{table.area}</p>
              <button
                onClick={() => toggleTable(table)}
                className={
                  "w-fit rounded-full px-3 py-1.5 text-xs font-bold " +
                  (table.active ? "bg-sage/35 text-moss" : "bg-ink/8 text-ink/45")
                }
              >
                {table.active ? "Active" : "Inactive"}
              </button>
              <div className="flex justify-start gap-2 md:justify-end">
                <button
                  onClick={() => copyLink(table.tagCode)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-ink/10"
                  aria-label={"Copy link for table " + table.tableNumber}
                >
                  {copied === table.tagCode ? (
                    <Check size={16} className="text-moss" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
                <button
                  onClick={() => downloadQrCode(table)}
                  disabled={downloadingQr === table.id}
                  className="grid h-9 w-9 place-items-center rounded-full border border-ink/10"
                  aria-label={"Download QR code for table " + table.tableNumber}
                  title="Download QR code"
                >
                  <QrCode
                    size={16}
                    className={downloadingQr === table.id ? "animate-pulse" : ""}
                  />
                </button>
                <Link
                  href={"/site/rate/" + table.tagCode}
                  className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white"
                  aria-label={"Open table " + table.tableNumber + " student page"}
                >
                  <ExternalLink size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>

      {downloadError ? (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">
          {downloadError}
        </p>
      ) : null}

      <aside className="mt-5 rounded-2xl border border-sun/50 bg-sun/15 p-5 text-sm leading-6 text-ink/70">
        <strong className="text-ink">How meal detection works:</strong> when a
        student opens a tag link, the server uses the school timezone, today&apos;s
        date, and the active meal window to load exactly the menu scheduled for
        that moment.
      </aside>

      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-5 backdrop-blur-sm">
          <form
            onSubmit={createTable}
            className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-tomato">New access point</p>
                <h2 className="mt-1 text-2xl font-bold">Create a table tag</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-cream"
              >
                <X size={17} />
              </button>
            </div>
            <label className="mt-6 block text-sm font-bold">
              Table number
              <input
                required
                min="1"
                name="tableNumber"
                type="number"
                placeholder="14"
                onChange={(event) => {
                  const tagInput = event.currentTarget.form?.elements.namedItem(
                    "tagCode",
                  ) as HTMLInputElement | null;
                  if (tagInput && !tagInput.dataset.edited) {
                    tagInput.value = "tag" + event.target.value;
                  }
                }}
                className="mt-2 h-12 w-full rounded-xl border border-ink/10 px-4 font-normal outline-none focus:border-moss"
              />
            </label>
            <label className="mt-4 block text-sm font-bold">
              Public tag ID
              <div className="mt-2 flex h-12 items-center rounded-xl border border-ink/10 px-4">
                <span className="text-sm text-ink/35">/site/rate/</span>
                <input
                  required
                  name="tagCode"
                  placeholder="tag14"
                  onInput={(event) => {
                    event.currentTarget.dataset.edited = "true";
                  }}
                  className="min-w-0 flex-1 font-mono text-sm font-normal outline-none"
                />
              </div>
            </label>
            <label className="mt-4 block text-sm font-bold">
              Dining area
              <input
                name="area"
                placeholder="Main hall"
                className="mt-2 h-12 w-full rounded-xl border border-ink/10 px-4 font-normal outline-none focus:border-moss"
              />
            </label>
            {formError && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                {formError}
              </p>
            )}
            <button className="mt-6 w-full rounded-full bg-ink px-5 py-3.5 font-bold text-white hover:bg-moss">
              Create tag link
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
