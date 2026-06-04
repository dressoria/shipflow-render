import "server-only";

export type DelivereoServerConfig = {
  baseUrl: string | null;
  apiKey: string | null;
  username: string | null;
  password: string | null;
  ruc: string | null;
  timeoutMs: number;
  enabled: boolean;
};

export type DelivereoCredentialStatus = {
  configured: boolean;
  credentialsPresent: boolean;
  baseUrl: string | null;
  enabled: boolean;
  timeoutMs: number;
  missingFields: string[];
};

function parseBoolean(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function parseTimeout(value: string | undefined) {
  const parsed = Number(value ?? 10000);
  if (!Number.isFinite(parsed)) return 10000;
  return Math.min(Math.max(Math.trunc(parsed), 1000), 30000);
}

export function readDelivereoServerConfig(): DelivereoServerConfig {
  const baseUrl = process.env.DELIVEREO_BASE_URL?.trim() || null;
  const apiKey = process.env.DELIVEREO_API?.trim() || null;
  const username = process.env.DELIVEREO_USERNAME?.trim() || null;
  const password = process.env.DELIVEREO_PASSWORD?.trim() || null;
  const ruc = process.env.DELIVEREO_RUC?.trim() || null;

  return {
    baseUrl,
    apiKey,
    username,
    password,
    ruc,
    timeoutMs: parseTimeout(process.env.DELIVEREO_TIMEOUT_MS),
    enabled: parseBoolean(process.env.DELIVEREO_ENABLED),
  };
}

export function getDelivereoMissingConfigFields(config: DelivereoServerConfig): string[] {
  const missing: string[] = [];
  if (!config.baseUrl) missing.push("DELIVEREO_BASE_URL");
  if (!config.apiKey) missing.push("DELIVEREO_API");
  if (!config.username) missing.push("DELIVEREO_USERNAME");
  if (!config.ruc) missing.push("DELIVEREO_RUC");
  return missing;
}

export function getDelivereoCredentialStatus(): DelivereoCredentialStatus {
  const config = readDelivereoServerConfig();
  const missingFields = getDelivereoMissingConfigFields(config);
  const credentialsPresent = missingFields.length === 0;

  return {
    configured: credentialsPresent && config.enabled,
    credentialsPresent,
    baseUrl: config.baseUrl,
    enabled: config.enabled,
    timeoutMs: config.timeoutMs,
    missingFields,
  };
}
