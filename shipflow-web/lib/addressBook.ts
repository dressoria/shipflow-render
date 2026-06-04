export type AddressBookRole = "sender" | "recipient" | "both";
export type AddressBookCountry = "EC" | "US";

export type AddressBookEntry = {
  id: string;
  userId?: string;
  label: string;
  country: AddressBookCountry;
  role: AddressBookRole;
  contactName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region: string;
  postalCode?: string;
  phone: string;
  email?: string;
  reference?: string;
  latitude?: number;
  longitude?: number;
  isDefaultSender: boolean;
  isDefaultRecipient: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AddressBookEntryDraft = Omit<AddressBookEntry, "id" | "createdAt" | "updatedAt" | "userId">;
export type LastUsedAddress = { id: string; role: AddressBookRole };

export const ADDRESS_BOOK_STORAGE_KEY = "sendiflash-address-book-v1";
export const ADDRESS_BOOK_LAST_USED_KEY = "sendiflash-address-book-last-used";
export const ADDRESS_BOOK_IMPORTED_KEY = "sendiflash-address-book-imported-v1";

export function createAddressBookId() {
  return `addr_${Math.random().toString(36).slice(2, 10)}`;
}

export function isDefaultForRole(entry: Pick<AddressBookEntry, "role" | "isDefaultSender" | "isDefaultRecipient">, role?: AddressBookRole) {
  if (role === "sender") return entry.isDefaultSender;
  if (role === "recipient") return entry.isDefaultRecipient;
  return entry.isDefaultSender || entry.isDefaultRecipient;
}

export function sortAddressEntries(entries: AddressBookEntry[]) {
  return [...entries].sort((a, b) => {
    const aDefault = isDefaultForRole(a);
    const bDefault = isDefaultForRole(b);
    if (aDefault && !bDefault) return -1;
    if (!aDefault && bDefault) return 1;
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
      entry.company,
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
    const parsed = JSON.parse(raw) as Array<Partial<AddressBookEntry> & { isDefault?: boolean }>;
    if (!Array.isArray(parsed)) return [];
    return sortAddressEntries(
      parsed.map((entry) => ({
        id: entry.id ?? createAddressBookId(),
        label: entry.label ?? "",
        country: entry.country === "US" ? "US" : "EC",
        role: entry.role === "sender" || entry.role === "recipient" || entry.role === "both" ? entry.role : "both",
        contactName: entry.contactName ?? "",
        company: entry.company,
        addressLine1: entry.addressLine1 ?? "",
        addressLine2: entry.addressLine2,
        city: entry.city ?? "",
        region: entry.region ?? "",
        postalCode: entry.postalCode,
        phone: entry.phone ?? "",
        email: entry.email,
        reference: entry.reference,
        latitude: entry.latitude,
        longitude: entry.longitude,
        isDefaultSender: entry.isDefaultSender ?? entry.isDefault ?? false,
        isDefaultRecipient: entry.isDefaultRecipient ?? entry.isDefault ?? false,
        createdAt: entry.createdAt ?? new Date().toISOString(),
        updatedAt: entry.updatedAt ?? new Date().toISOString(),
      })),
    );
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

export function readLastUsedAddress(): LastUsedAddress | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ADDRESS_BOOK_LAST_USED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastUsedAddress;
    if (!parsed?.id || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasImportedLegacyAddressBook() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADDRESS_BOOK_IMPORTED_KEY) === "true";
}

export function markLegacyAddressBookImported() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADDRESS_BOOK_IMPORTED_KEY, "true");
}

export function clearLegacyAddressBookEntries() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADDRESS_BOOK_STORAGE_KEY);
}

export function toAddressBookDraft(entry: AddressBookEntry): AddressBookEntryDraft {
  return {
    label: entry.label,
    country: entry.country,
    role: entry.role,
    contactName: entry.contactName,
    company: entry.company,
    addressLine1: entry.addressLine1,
    addressLine2: entry.addressLine2,
    city: entry.city,
    region: entry.region,
    postalCode: entry.postalCode,
    phone: entry.phone,
    email: entry.email,
    reference: entry.reference,
    latitude: entry.latitude,
    longitude: entry.longitude,
    isDefaultSender: entry.isDefaultSender,
    isDefaultRecipient: entry.isDefaultRecipient,
  };
}

type AddressApiRow = {
  id: string;
  user_id?: string;
  label: string;
  country: AddressBookCountry;
  type: AddressBookRole;
  contact_name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string;
  address_line2: string | null;
  reference: string | null;
  city: string;
  state_province: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default_sender: boolean;
  is_default_recipient: boolean;
  created_at: string;
  updated_at: string;
};

function mapAddressRow(row: AddressApiRow): AddressBookEntry {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    country: row.country,
    role: row.type,
    contactName: row.contact_name ?? "",
    company: row.company ?? undefined,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2 ?? undefined,
    city: row.city,
    region: row.state_province ?? "",
    postalCode: row.postal_code ?? undefined,
    phone: row.phone ?? "",
    email: row.email ?? undefined,
    reference: row.reference ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    isDefaultSender: row.is_default_sender,
    isDefaultRecipient: row.is_default_recipient,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type AddressApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
  details?: string | null;
};

async function getToken() {
  const { supabase } = await import("@/lib/supabase");
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function addressBookFetch<T>(path: string, init: RequestInit = {}) {
  const token = await getToken();
  if (!token) {
    throw new Error("Debes iniciar sesión para gestionar tu libreta de direcciones.");
  }

  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const response = await fetch(path, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) } });
  const json = (await response.json()) as AddressApiEnvelope<T>;
  if (!response.ok || !json.success || !json.data) {
    const message = [json.error, json.details].filter(Boolean).join(" ");
    throw new Error(message || `API error (${response.status})`);
  }
  return json.data;
}

export async function listAddresses() {
  const data = await addressBookFetch<{ addresses: AddressApiRow[] }>("/api/user-addresses");
  return sortAddressEntries(data.addresses.map(mapAddressRow));
}

export async function createAddress(draft: AddressBookEntryDraft) {
  const data = await addressBookFetch<{ address: AddressApiRow }>("/api/user-addresses", {
    method: "POST",
    body: JSON.stringify(addressDraftToPayload(draft)),
  });
  return mapAddressRow(data.address);
}

export async function updateAddress(id: string, draft: AddressBookEntryDraft) {
  const data = await addressBookFetch<{ address: AddressApiRow }>(`/api/user-addresses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(addressDraftToPayload(draft)),
  });
  return mapAddressRow(data.address);
}

export async function deleteAddress(id: string) {
  await addressBookFetch<{ deleted: boolean }>(`/api/user-addresses/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function setDefaultAddress(id: string, mode: "sender" | "recipient" | "both") {
  const data = await addressBookFetch<{ address: AddressApiRow }>(`/api/user-addresses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ makeDefault: true, defaultMode: mode }),
  });
  return mapAddressRow(data.address);
}

export async function importLegacyAddresses(addresses: AddressBookEntry[]) {
  const payload = addresses.map((entry) => addressDraftToPayload(toAddressBookDraft(entry)));
  const data = await addressBookFetch<{ imported: number; addresses: AddressApiRow[] }>("/api/user-addresses/import", {
    method: "POST",
    body: JSON.stringify({ addresses: payload }),
  });
  return {
    imported: data.imported,
    addresses: sortAddressEntries(data.addresses.map(mapAddressRow)),
  };
}

function addressDraftToPayload(draft: AddressBookEntryDraft) {
  return {
    label: draft.label,
    country: draft.country,
    role: draft.role,
    contactName: draft.contactName,
    company: draft.company,
    phone: draft.phone,
    email: draft.email,
    addressLine1: draft.addressLine1,
    addressLine2: draft.addressLine2,
    city: draft.city,
    region: draft.region,
    postalCode: draft.postalCode,
    latitude: draft.latitude,
    longitude: draft.longitude,
    isDefaultSender: draft.isDefaultSender,
    isDefaultRecipient: draft.isDefaultRecipient,
  };
}
