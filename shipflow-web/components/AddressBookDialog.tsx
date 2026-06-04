"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useRegionMode } from "@/contexts/RegionModeContext";
import type { AddressBookCountry, AddressBookEntry, AddressBookEntryDraft, AddressBookRole } from "@/lib/addressBook";

const DEFAULT_DRAFT: AddressBookEntryDraft = {
  label: "",
  country: "EC",
  role: "both",
  contactName: "",
  company: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  phone: "",
  email: "",
  reference: "",
  latitude: undefined,
  longitude: undefined,
  isDefaultSender: false,
  isDefaultRecipient: false,
};

export function AddressBookDialog({
  open,
  initialValue,
  draftSeed,
  onClose,
  onSave,
}: {
  open: boolean;
  initialValue?: AddressBookEntry | null;
  draftSeed?: Partial<AddressBookEntryDraft> | null;
  onClose: () => void;
  onSave: (draft: AddressBookEntryDraft, existingId?: string) => Promise<void>;
}) {
  const { mode } = useRegionMode();
  const isEcuadorMode = mode === "ec";
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<AddressBookEntryDraft>(() =>
    initialValue
      ? {
          label: initialValue.label,
          country: initialValue.country,
          role: initialValue.role,
          contactName: initialValue.contactName,
          company: initialValue.company ?? "",
          addressLine1: initialValue.addressLine1,
          addressLine2: initialValue.addressLine2 ?? "",
          city: initialValue.city,
          region: initialValue.region,
          postalCode: initialValue.postalCode ?? "",
          phone: initialValue.phone,
          email: initialValue.email ?? "",
          reference: initialValue.reference ?? "",
          latitude: initialValue.latitude,
          longitude: initialValue.longitude,
          isDefaultSender: initialValue.isDefaultSender,
          isDefaultRecipient: initialValue.isDefaultRecipient,
        }
      : {
          ...DEFAULT_DRAFT,
          country: isEcuadorMode ? "EC" : "US",
          ...draftSeed,
        },
  );

  if (!open) return null;

  const roleOptions: Array<{ value: AddressBookRole; label: string }> = isEcuadorMode
    ? [
        { value: "sender", label: "Remitente" },
        { value: "recipient", label: "Destinatario" },
        { value: "both", label: "Ambos" },
      ]
    : [
        { value: "sender", label: "Sender" },
        { value: "recipient", label: "Recipient" },
        { value: "both", label: "Both" },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">
              {isEcuadorMode ? "Libreta de direcciones" : "Address book"}
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {initialValue
                ? isEcuadorMode
                  ? "Editar dirección"
                  : "Edit address"
                : isEcuadorMode
                  ? "Añadir nueva dirección"
                  : "Add new address"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            aria-label={isEcuadorMode ? "Cerrar" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (draft.phone.trim().length < 7) {
              setError(isEcuadorMode ? "Ingresa un teléfono válido con al menos 7 dígitos." : "Enter a valid phone number with at least 7 digits.");
              return;
            }
            if (draft.email && !draft.email.includes("@")) {
              setError(isEcuadorMode ? "Ingresa un email válido o deja el campo vacío." : "Enter a valid email or leave it blank.");
              return;
            }
            setError("");
            setSaving(true);
            try {
              await onSave(draft, initialValue?.id);
              onClose();
            } catch (nextError) {
              setError(nextError instanceof Error ? nextError.message : isEcuadorMode ? "No pudimos guardar la dirección." : "We could not save the address.");
            } finally {
              setSaving(false);
            }
          }}
          className="grid gap-5 px-6 py-6"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextField label={isEcuadorMode ? "Etiqueta" : "Label"} value={draft.label} onChange={(value) => setDraft((current) => ({ ...current, label: value }))} required />
            <SelectField
              label={isEcuadorMode ? "Tipo" : "Role"}
              value={draft.role}
              options={roleOptions}
              onChange={(value) => setDraft((current) => ({ ...current, role: value as AddressBookRole }))}
            />
            <SelectField
              label={isEcuadorMode ? "País" : "Country"}
              value={draft.country}
              options={[
                { value: "EC", label: isEcuadorMode ? "Ecuador" : "Ecuador" },
                { value: "US", label: isEcuadorMode ? "Estados Unidos" : "United States" },
              ]}
              onChange={(value) => setDraft((current) => ({ ...current, country: value as AddressBookCountry }))}
            />
            <TextField label={isEcuadorMode ? "Nombre / contacto" : "Contact name"} value={draft.contactName} onChange={(value) => setDraft((current) => ({ ...current, contactName: value }))} required />
            <TextField label={isEcuadorMode ? "Empresa" : "Company"} value={draft.company ?? ""} onChange={(value) => setDraft((current) => ({ ...current, company: value }))} />
            <TextField label={isEcuadorMode ? "Teléfono" : "Phone"} value={draft.phone} onChange={(value) => setDraft((current) => ({ ...current, phone: value }))} required />
            <TextField label="Email" value={draft.email ?? ""} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={isEcuadorMode ? "Dirección" : "Address"} value={draft.addressLine1} onChange={(value) => setDraft((current) => ({ ...current, addressLine1: value }))} required />
            <TextField label={isEcuadorMode ? "Complemento" : "Address line 2"} value={draft.addressLine2 ?? ""} onChange={(value) => setDraft((current) => ({ ...current, addressLine2: value }))} />
            <TextField label={isEcuadorMode ? "Ciudad" : "City"} value={draft.city} onChange={(value) => setDraft((current) => ({ ...current, city: value }))} required />
            <TextField label={isEcuadorMode ? "Provincia / estado" : "State / province"} value={draft.region} onChange={(value) => setDraft((current) => ({ ...current, region: value }))} required />
            <TextField label={isEcuadorMode ? "Código postal" : "Postal code"} value={draft.postalCode ?? ""} onChange={(value) => setDraft((current) => ({ ...current, postalCode: value }))} />
          </div>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              {isEcuadorMode ? "Referencia" : "Reference"}
            </span>
            <textarea
              value={draft.reference ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, reference: event.target.value }))}
              className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              placeholder={isEcuadorMode ? "Puntos de referencia, edificio o instrucciones" : "Landmarks, building, or instructions"}
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={draft.isDefaultSender}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  isDefaultSender: event.target.checked,
                }))
              }
            />
            <span>{isEcuadorMode ? "Usar como remitente predeterminado" : "Use as default sender"}</span>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={draft.isDefaultRecipient}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  isDefaultRecipient: event.target.checked,
                }))
              }
            />
            <span>{isEcuadorMode ? "Usar como destinatario predeterminado" : "Use as default recipient"}</span>
          </label>

          {error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              {isEcuadorMode ? "Cancelar" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-sky-600 px-5 text-sm font-bold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700"
            >
              {saving
                ? isEcuadorMode
                  ? "Guardando..."
                  : "Saving..."
                : initialValue
                ? isEcuadorMode
                  ? "Guardar cambios"
                  : "Save changes"
                : isEcuadorMode
                  ? "Guardar dirección"
                  : "Save address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <input
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
