export type AddressBookRole = "sender" | "recipient" | "both";

export type AddressBookEntry = {
  id: string;
  label: string;
  country: string;
  role: AddressBookRole;
  contactName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region: string;
  postalCode?: string;
  phone: string;
  email?: string;
  reference?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AddressBookEntryDraft = Omit<AddressBookEntry, "id" | "createdAt" | "updatedAt">;

export const ADDRESS_BOOK_STORAGE_KEY = "sendiflash-address-book-v1";
export const ADDRESS_BOOK_LAST_USED_KEY = "sendiflash-address-book-last-used";

export function createAddressBookId() {
  return `addr_${Math.random().toString(36).slice(2, 10)}`;
}

export function sortAddressEntries(entries: AddressBookEntry[]) {
  return [...entries].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function filterAddressEntries(entries: AddressBookEntry[], query: string, role?: AddressBookRole) {
  const normalized = query.trim().toLowerCase();

  return entries.filter((entry) => {
    const roleMatches = !role || entry.role === role || entry.role === "both";
    if (!roleMatches) return false;
    if (!normalized) return true;

    const haystack = [
      entry.label,
      entry.contactName,
      entry.city,
      entry.region,
      entry.addressLine1,
      entry.addressLine2,
      entry.reference,
      entry.phone,
      entry.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export function formatAddressSummary(entry: Pick<AddressBookEntry, "addressLine1" | "addressLine2" | "city" | "region" | "country">) {
  return [entry.addressLine1, entry.addressLine2, `${entry.city}, ${entry.region}`, entry.country]
    .filter(Boolean)
    .join(" · ");
}

export function readAddressBookEntries(): AddressBookEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(ADDRESS_BOOK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AddressBookEntry[];
    if (!Array.isArray(parsed)) return [];
    return sortAddressEntries(parsed);
  } catch {
    return [];
  }
}

export function writeAddressBookEntries(entries: AddressBookEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADDRESS_BOOK_STORAGE_KEY, JSON.stringify(sortAddressEntries(entries)));
}

export function rememberLastUsedAddress(entry: Pick<AddressBookEntry, "id" | "role">) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADDRESS_BOOK_LAST_USED_KEY, JSON.stringify(entry));
}

export function readLastUsedAddress(): { id: string; role: AddressBookRole } | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ADDRESS_BOOK_LAST_USED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id: string; role: AddressBookRole };
    if (!parsed?.id || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}
