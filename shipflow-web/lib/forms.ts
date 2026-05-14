export function required(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isPhone(value: string) {
  return /^[0-9+\-\s()]{7,18}$/.test(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
