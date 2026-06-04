"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  clearLegacyAddressBookEntries,
  createAddress,
  deleteAddress,
  hasImportedLegacyAddressBook,
  importLegacyAddresses,
  listAddresses,
  markLegacyAddressBookImported,
  readAddressBookEntries,
  setDefaultAddress,
  sortAddressEntries,
  type AddressBookEntry,
  type AddressBookEntryDraft,
  updateAddress,
} from "@/lib/addressBook";

export function useAddressBook() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [legacyEntries, setLegacyEntries] = useState<AddressBookEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      queueMicrotask(() => {
        if (cancelled) return;
        setEntries([]);
        setLegacyEntries([]);
        setLoaded(true);
        setError(null);
      });
      return () => {
        cancelled = true;
      };
    }

    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoaded(false);
      setError(null);

      try {
        const remoteEntries = await listAddresses();
        if (cancelled) return;
        setEntries(sortAddressEntries(remoteEntries));
        const localEntries = readAddressBookEntries();
        setLegacyEntries(hasImportedLegacyAddressBook() ? [] : localEntries);
      } catch (nextError) {
        if (cancelled) return;
        setError(nextError instanceof Error ? nextError.message : "No pudimos cargar la libreta de direcciones.");
        setEntries([]);
      } finally {
        if (cancelled) return;
        setLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  async function refresh() {
    if (!user) return;
    const remoteEntries = await listAddresses();
    setEntries(sortAddressEntries(remoteEntries));
  }

  async function upsertEntry(input: AddressBookEntryDraft, existingId?: string) {
    setSaving(true);
    setError(null);

    try {
      if (existingId) {
        await updateAddress(existingId, input);
      } else {
        await createAddress(input);
      }
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos guardar la dirección.");
      throw nextError;
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(id: string) {
    setSaving(true);
    setError(null);

    try {
      await deleteAddress(id);
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos eliminar la dirección.");
      throw nextError;
    } finally {
      setSaving(false);
    }
  }

  async function markDefault(id: string, mode: "sender" | "recipient" | "both" = "both") {
    setSaving(true);
    setError(null);

    try {
      await setDefaultAddress(id, mode);
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos actualizar la dirección predeterminada.");
      throw nextError;
    } finally {
      setSaving(false);
    }
  }

  async function importLegacySavedAddresses() {
    if (!user || legacyEntries.length === 0) return 0;
    setImporting(true);
    setError(null);

    try {
      const result = await importLegacyAddresses(legacyEntries);
      setEntries(result.addresses);
      markLegacyAddressBookImported();
      clearLegacyAddressBookEntries();
      setLegacyEntries([]);
      return result.imported;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos importar las direcciones guardadas.");
      throw nextError;
    } finally {
      setImporting(false);
    }
  }

  return {
    entries,
    loaded,
    error,
    saving,
    importing,
    legacyEntries,
    hasLegacyEntriesToImport: legacyEntries.length > 0,
    upsertEntry,
    deleteEntry: removeEntry,
    markDefault,
    importLegacySavedAddresses,
    refresh,
  };
}
