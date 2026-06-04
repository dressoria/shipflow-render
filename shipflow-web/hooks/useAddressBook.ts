"use client";

import { useState } from "react";
import {
  createAddressBookId,
  readAddressBookEntries,
  sortAddressEntries,
  type AddressBookEntry,
  type AddressBookEntryDraft,
  writeAddressBookEntries,
} from "@/lib/addressBook";

export function useAddressBook() {
  const [entries, setEntries] = useState<AddressBookEntry[]>(() => readAddressBookEntries());
  const loaded = true;

  function upsertEntry(input: AddressBookEntryDraft, existingId?: string) {
    const now = new Date().toISOString();

    setEntries((current) => {
      const next = existingId
        ? current.map((entry) =>
            entry.id === existingId
              ? {
                  ...entry,
                  ...input,
                  updatedAt: now,
                }
              : input.isDefault
                ? { ...entry, isDefault: false }
                : entry,
          )
        : [
            {
              id: createAddressBookId(),
              ...input,
              createdAt: now,
              updatedAt: now,
            },
            ...current.map((entry) => (input.isDefault ? { ...entry, isDefault: false } : entry)),
          ];

      const sorted = sortAddressEntries(next);
      writeAddressBookEntries(sorted);
      return sorted;
    });
  }

  function deleteEntry(id: string) {
    setEntries((current) => {
      const next = current.filter((entry) => entry.id !== id);
      writeAddressBookEntries(next);
      return next;
    });
  }

  function markDefault(id: string) {
    setEntries((current) => {
      const next = current.map((entry) => ({ ...entry, isDefault: entry.id === id }));
      writeAddressBookEntries(next);
      return sortAddressEntries(next);
    });
  }

  return {
    entries,
    loaded,
    upsertEntry,
    deleteEntry,
    markDefault,
  };
}
