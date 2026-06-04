import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaColumnError } from "@/lib/server/apiResponse";

export type UserAddressRow = {
  id: string;
  user_id: string;
  label: string;
  country: "EC" | "US";
  type: "sender" | "recipient" | "both";
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

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function logUserAddressServerError(scope: string, error: unknown) {
  const candidate = error as SupabaseLikeError | Response | Error | undefined;
  if (candidate instanceof Response) {
    console.error(`[user-addresses:${scope}]`, { status: candidate.status });
    return;
  }
  if (candidate instanceof Error) {
    console.error(`[user-addresses:${scope}]`, { message: candidate.message });
    return;
  }
  if (candidate && typeof candidate === "object") {
    console.error(`[user-addresses:${scope}]`, {
      code: candidate.code,
      message: candidate.message,
      details: candidate.details,
      hint: candidate.hint,
    });
    return;
  }
  console.error(`[user-addresses:${scope}]`, { error: String(error) });
}

export function getUserAddressErrorDetails(error: unknown) {
  if (error instanceof Response) {
    if (error.status === 401) return "Unauthorized";
    if (error.status === 403) return "Debes verificar tu correo o volver a iniciar sesión.";
    return `Error ${error.status}`;
  }

  if (error instanceof Error) {
    if (error.message === "Missing authorization token." || error.message === "Invalid authorization token.") {
      return "Unauthorized";
    }
    if (error.message === "EMAIL_NOT_VERIFIED") {
      return "Debes verificar tu correo antes de guardar direcciones.";
    }
    return error.message;
  }

  const candidate = error as SupabaseLikeError | undefined;
  const code = candidate?.code?.toUpperCase();
  const message = candidate?.message?.trim();
  const details = candidate?.details?.trim();

  if (code === "42501") return "No tienes permisos para modificar esta dirección.";
  if (code === "23505") return "Ya existe una dirección igual en tu libreta.";
  if (code === "PGRST116") return "No encontramos la dirección solicitada.";
  if (isMissingReferenceColumnError(error)) {
    return "La tabla de direcciones actual no tiene el campo de referencia. El guardado continuará sin ese dato cuando sea posible.";
  }

  return details || message || "Revisa los campos obligatorios o vuelve a iniciar sesión.";
}

export type UserAddressInput = {
  label: string;
  country: "EC" | "US";
  role: "sender" | "recipient" | "both";
  contactName: string;
  company?: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  reference?: string;
  city: string;
  region: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isDefaultSender?: boolean;
  isDefaultRecipient?: boolean;
};

function isMissingReferenceColumnError(error: unknown) {
  if (!isMissingSchemaColumnError(error)) return false;
  const candidate = error as SupabaseLikeError;
  const haystack = [candidate.message, candidate.details, candidate.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes("reference");
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNullableText(value: unknown) {
  const text = cleanText(value);
  return text || null;
}

function cleanNullableNumber(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

export function normalizeUserAddressInput(body: unknown): UserAddressInput {
  const input = (body ?? {}) as Record<string, unknown>;
  const country = cleanText(input.country).toUpperCase();
  const role = cleanText(input.role || input.type) as UserAddressInput["role"];

  const normalized: UserAddressInput = {
    label: cleanText(input.label),
    country: country === "US" ? "US" : "EC",
    role: role === "sender" || role === "recipient" || role === "both" ? role : "both",
    contactName: cleanText(input.contactName),
    company: cleanNullableText(input.company) ?? undefined,
    phone: cleanText(input.phone),
    email: cleanNullableText(input.email) ?? undefined,
    addressLine1: cleanText(input.addressLine1),
    addressLine2: cleanNullableText(input.addressLine2) ?? undefined,
    reference: cleanNullableText(input.reference) ?? undefined,
    city: cleanText(input.city),
    region: cleanText(input.region || input.stateProvince),
    postalCode: cleanNullableText(input.postalCode) ?? undefined,
    latitude: cleanNullableNumber(input.latitude) ?? undefined,
    longitude: cleanNullableNumber(input.longitude) ?? undefined,
    isDefaultSender: input.isDefaultSender === true,
    isDefaultRecipient: input.isDefaultRecipient === true,
  };

  if (!normalized.label) throw new Error("Falta el campo obligatorio: etiqueta.");
  if (!normalized.contactName) throw new Error("Falta el campo obligatorio: nombre de contacto.");
  if (!normalized.phone) throw new Error("Falta el campo obligatorio: teléfono.");
  if (!normalized.addressLine1) throw new Error("Falta el campo obligatorio: dirección.");
  if (!normalized.city) throw new Error("Falta el campo obligatorio: ciudad.");
  if (!normalized.region) throw new Error("Falta el campo obligatorio: provincia o estado.");

  return normalized;
}

export async function listUserAddresses(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as UserAddressRow[];
}

async function clearDefaultFlags(
  supabase: SupabaseClient,
  userId: string,
  addressId: string,
  country: "EC" | "US",
  clearSender: boolean,
  clearRecipient: boolean,
) {
  if (clearSender) {
    const { error } = await supabase
      .from("user_addresses")
      .update({ is_default_sender: false })
      .eq("user_id", userId)
      .eq("country", country)
      .neq("id", addressId)
      .eq("is_default_sender", true);
    if (error) throw error;
  }

  if (clearRecipient) {
    const { error } = await supabase
      .from("user_addresses")
      .update({ is_default_recipient: false })
      .eq("user_id", userId)
      .eq("country", country)
      .neq("id", addressId)
      .eq("is_default_recipient", true);
    if (error) throw error;
  }
}

function toRowInsert(userId: string, input: UserAddressInput) {
  return {
    user_id: userId,
    label: input.label,
    country: input.country,
    type: input.role,
    contact_name: input.contactName,
    company: input.company ?? null,
    phone: input.phone,
    email: input.email ?? null,
    address_line1: input.addressLine1,
    address_line2: input.addressLine2 ?? null,
    city: input.city,
    state_province: input.region,
    postal_code: input.postalCode ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    is_default_sender: input.isDefaultSender === true,
    is_default_recipient: input.isDefaultRecipient === true,
  };
}

function toRowInsertWithReference(userId: string, input: UserAddressInput) {
  return {
    ...toRowInsert(userId, input),
    reference: input.reference ?? null,
  };
}

async function insertUserAddressRow(
  supabase: SupabaseClient,
  userId: string,
  input: UserAddressInput,
) {
  const initialInsert = await supabase
    .from("user_addresses")
    .insert(toRowInsertWithReference(userId, input))
    .select("*")
    .single();

  if (!initialInsert.error) {
    return initialInsert.data as UserAddressRow;
  }

  if (!isMissingReferenceColumnError(initialInsert.error)) {
    throw initialInsert.error;
  }

  const fallbackInsert = await supabase
    .from("user_addresses")
    .insert(toRowInsert(userId, input))
    .select("*")
    .single();

  if (fallbackInsert.error) throw fallbackInsert.error;
  return fallbackInsert.data as UserAddressRow;
}

async function updateUserAddressRow(
  supabase: SupabaseClient,
  userId: string,
  addressId: string,
  input: UserAddressInput,
) {
  const initialUpdate = await supabase
    .from("user_addresses")
    .update(toRowInsertWithReference(userId, input))
    .eq("id", addressId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (!initialUpdate.error) {
    return initialUpdate.data as UserAddressRow;
  }

  if (!isMissingReferenceColumnError(initialUpdate.error)) {
    throw initialUpdate.error;
  }

  const fallbackUpdate = await supabase
    .from("user_addresses")
    .update(toRowInsert(userId, input))
    .eq("id", addressId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (fallbackUpdate.error) throw fallbackUpdate.error;
  return fallbackUpdate.data as UserAddressRow;
}

export async function createUserAddress(supabase: SupabaseClient, userId: string, input: UserAddressInput) {
  const row = await insertUserAddressRow(supabase, userId, input);
  await clearDefaultFlags(
    supabase,
    userId,
    row.id,
    row.country,
    row.is_default_sender,
    row.is_default_recipient,
  );

  return row;
}

export async function updateUserAddress(
  supabase: SupabaseClient,
  userId: string,
  addressId: string,
  input: UserAddressInput,
) {
  const row = await updateUserAddressRow(supabase, userId, addressId, input);
  await clearDefaultFlags(
    supabase,
    userId,
    row.id,
    row.country,
    row.is_default_sender,
    row.is_default_recipient,
  );

  return row;
}

export async function deleteUserAddress(supabase: SupabaseClient, userId: string, addressId: string) {
  const { error } = await supabase
    .from("user_addresses")
    .delete()
    .eq("id", addressId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function setUserAddressDefault(
  supabase: SupabaseClient,
  userId: string,
  addressId: string,
  mode: "sender" | "recipient" | "both",
) {
  const { data, error } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("id", addressId)
    .eq("user_id", userId)
    .single();

  if (error || !data) throw error ?? new Error("Address not found.");
  const row = data as UserAddressRow;

  const patch = {
    is_default_sender: mode === "sender" || mode === "both" ? true : row.is_default_sender,
    is_default_recipient: mode === "recipient" || mode === "both" ? true : row.is_default_recipient,
  };

  const { data: updated, error: updateError } = await supabase
    .from("user_addresses")
    .update(patch)
    .eq("id", addressId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (updateError || !updated) throw updateError ?? new Error("Address could not be updated.");

  const updatedRow = updated as UserAddressRow;
  await clearDefaultFlags(
    supabase,
    userId,
    updatedRow.id,
    updatedRow.country,
    mode === "sender" || mode === "both",
    mode === "recipient" || mode === "both",
  );

  return updatedRow;
}
