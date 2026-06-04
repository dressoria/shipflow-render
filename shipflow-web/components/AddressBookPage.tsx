"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookMarked, MapPinned, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { AddressBookDialog } from "@/components/AddressBookDialog";
import { DashboardShell } from "@/components/DashboardShell";
import { useAddressBook } from "@/hooks/useAddressBook";
import { useRegionMode } from "@/contexts/RegionModeContext";
import { filterAddressEntries, formatAddressSummary, rememberLastUsedAddress, type AddressBookEntry } from "@/lib/addressBook";

export function AddressBookPage() {
  const { mode } = useRegionMode();
  const isEcuadorMode = mode === "ec";
  const { entries, loaded, upsertEntry, deleteEntry, markDefault } = useAddressBook();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AddressBookEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => filterAddressEntries(entries, query), [entries, query]);
  const quoteHref = isEcuadorMode ? "/ecuador/crear-envio" : "/crear-guia";

  return (
    <DashboardShell
      title={isEcuadorMode ? "Libreta de direcciones" : "Address book"}
      description={
        isEcuadorMode
          ? "Guarda direcciones frecuentes para reutilizarlas en cotizaciones, solicitudes y preparación operativa."
          : "Save your frequent addresses and reuse them in quotes, shipments, and operational flows."
      }
    >
      <div className="grid gap-5">
        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">
                {isEcuadorMode ? "Direcciones frecuentes" : "Saved addresses"}
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {isEcuadorMode ? "Organiza remitentes y destinatarios desde un solo lugar" : "Manage senders and recipients from one place"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {isEcuadorMode
                  ? "Etiquetas como Bodega 1, Casa, Oficina o Proveedor Guayaquil listas para usar en tus siguientes cotizaciones."
                  : "Keep labels like Warehouse 1, Home, Office, or Frequent Customer ready for your next quote."}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={quoteHref}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {isEcuadorMode ? "Ir a cotización" : "Go to quote"}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-sky-600 px-5 text-sm font-bold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                {isEcuadorMode ? "Añadir nueva dirección" : "Add new address"}
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                isEcuadorMode
                  ? "Buscar por etiqueta, nombre, ciudad o dirección"
                  : "Search by label, contact, city, or address"
              }
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {!loaded ? (
            <AddressBookEmptyState
              title={isEcuadorMode ? "Cargando direcciones" : "Loading addresses"}
              body={isEcuadorMode ? "Estamos preparando tu libreta guardada." : "Preparing your saved address book."}
            />
          ) : filtered.length === 0 ? (
            <AddressBookEmptyState
              title={isEcuadorMode ? "Todavía no tienes direcciones guardadas" : "You do not have saved addresses yet"}
              body={
                isEcuadorMode
                  ? "Añade tu primera dirección para reutilizarla en cotizaciones Ecuador y flujos USA."
                  : "Add your first address to reuse it across Ecuador and USA flows."
              }
            />
          ) : (
            filtered.map((entry) => (
              <article key={entry.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                        {entry.label}
                      </span>
                      {entry.isDefault ? (
                        <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                          {isEcuadorMode ? "Predeterminada" : "Default"}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-lg font-black text-slate-950">{entry.contactName}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {entry.city}, {entry.region} · {entry.country}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {entry.role === "both"
                      ? isEcuadorMode
                        ? "Ambos"
                        : "Both"
                      : entry.role === "sender"
                        ? isEcuadorMode
                          ? "Remitente"
                          : "Sender"
                        : isEcuadorMode
                          ? "Destinatario"
                          : "Recipient"}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-sm font-semibold text-slate-700">{formatAddressSummary(entry)}</p>
                  <p className="mt-2 text-sm text-slate-500">{entry.phone}</p>
                  {entry.email ? <p className="mt-1 text-sm text-slate-500">{entry.email}</p> : null}
                  {entry.reference ? <p className="mt-2 text-sm leading-6 text-slate-500">{entry.reference}</p> : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(entry);
                      setDialogOpen(true);
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    {isEcuadorMode ? "Editar" : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => markDefault(entry.id)}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
                  >
                    <Star className="mr-2 h-4 w-4" />
                    {isEcuadorMode ? "Marcar predeterminada" : "Mark default"}
                  </button>
                  <Link
                    href={quoteHref}
                    onClick={() => rememberLastUsedAddress({ id: entry.id, role: entry.role })}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
                  >
                    <MapPinned className="mr-2 h-4 w-4" />
                    {isEcuadorMode ? "Usar en cotización" : "Use in quote"}
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteEntry(entry.id)}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition hover:bg-red-100"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isEcuadorMode ? "Eliminar" : "Delete"}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      {dialogOpen ? (
        <AddressBookDialog
          key={editing?.id ?? "new"}
          open={dialogOpen}
          initialValue={editing}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          onSave={upsertEntry}
        />
      ) : null}
    </DashboardShell>
  );
}

function AddressBookEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="col-span-full rounded-[2rem] border border-dashed border-sky-200 bg-sky-50/60 p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-sky-700 shadow-sm">
        <BookMarked className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}
