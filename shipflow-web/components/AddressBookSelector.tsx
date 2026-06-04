"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookMarked, CheckCircle2, MapPinned, Plus, Search } from "lucide-react";
import { AddressBookDialog } from "@/components/AddressBookDialog";
import { useRegionMode } from "@/contexts/RegionModeContext";
import { useAddressBook } from "@/hooks/useAddressBook";
import {
  filterAddressEntries,
  formatAddressSummary,
  isDefaultForRole,
  rememberLastUsedAddress,
  type AddressBookEntry,
  type AddressBookRole,
} from "@/lib/addressBook";

export function AddressBookSelector({
  title,
  role,
  selectedId,
  onSelect,
}: {
  title: string;
  role: AddressBookRole;
  selectedId?: string | null;
  onSelect: (entry: AddressBookEntry) => void;
}) {
  const { mode } = useRegionMode();
  const isEcuadorMode = mode === "ec";
  const { entries, upsertEntry } = useAddressBook();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => filterAddressEntries(entries, query, role), [entries, query, role]);
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;

  return (
    <>
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{title}</p>
            <p className="mt-2 text-sm text-slate-600">
              {selected
                ? formatAddressSummary(selected)
                : isEcuadorMode
                  ? "Selecciona una dirección guardada o crea una nueva."
                  : "Select a saved address or add a new one."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <BookMarked className="mr-2 h-4 w-4" />
              {isEcuadorMode ? "Elegir de libreta" : "Choose from address book"}
            </button>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isEcuadorMode ? "Añadir" : "Add"}
            </button>
          </div>
        </div>

        {selected ? (
          <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-sky-700">
              <CheckCircle2 className="h-4 w-4" />
              {selected.label}
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-700">{selected.contactName}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{formatAddressSummary(selected)}</p>
          </div>
        ) : null}
      </div>

      {pickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">
                  {isEcuadorMode ? "Libreta de direcciones" : "Address book"}
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">{title}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/direcciones"
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  {isEcuadorMode ? "Administrar libreta" : "Manage address book"}
                </Link>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  {isEcuadorMode ? "Cerrar" : "Close"}
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  isEcuadorMode ? "Buscar por etiqueta, nombre, ciudad o dirección" : "Search by label, contact, city, or address"
                }
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="mt-5 grid max-h-[60vh] gap-3 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 p-6 text-center">
                  <MapPinned className="mx-auto h-5 w-5 text-sky-700" />
                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    {isEcuadorMode ? "No encontramos direcciones para este tipo." : "No saved addresses found for this role."}
                  </p>
                </div>
              ) : (
                filtered.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      rememberLastUsedAddress({ id: entry.id, role: entry.role });
                      onSelect(entry);
                      setPickerOpen(false);
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selectedId === entry.id ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">{entry.label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{entry.contactName}</p>
                      </div>
                      {isDefaultForRole(entry, role) ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">
                          {isEcuadorMode ? "Predeterminada" : "Default"}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{formatAddressSummary(entry)}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {dialogOpen ? (
        <AddressBookDialog
          key="new"
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={async (draft, existingId) => {
            await upsertEntry(draft, existingId);
            setDialogOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
