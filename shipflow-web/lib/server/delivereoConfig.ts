import "server-only";

export type DelivereoServerConfig = {
  baseUrl: string | null;
  username: string | null;
  password: string | null;
  timeoutMs: number;
  enabled: boolean;
};

export type DelivereoCredentialStatus = {
  configured: boolean;
  credentialsPresent: boolean;
  baseUrl: string | null;
  enabled: boolean;
  timeoutMs: number;
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
  const username = process.env.DELIVEREO_USERNAME?.trim() || null;
  const password = process.env.DELIVEREO_PASSWORD?.trim() || null;

  return {
    baseUrl,
    username,
    password,
    timeoutMs: parseTimeout(process.env.DELIVEREO_TIMEOUT_MS),
    enabled: parseBoolean(process.env.DELIVEREO_ENABLED),
  };
}

export function getDelivereoCredentialStatus(): DelivereoCredentialStatus {
  const config = readDelivereoServerConfig();
  const credentialsPresent = Boolean(config.baseUrl && config.username && config.password);

  return {
    configured: credentialsPresent && config.enabled,
    credentialsPresent,
    baseUrl: config.baseUrl,
    enabled: config.enabled,
    timeoutMs: config.timeoutMs,
  };
}
