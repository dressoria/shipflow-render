export type EcuadorProviderAuthType = "none" | "bearer" | "api_key" | "oauth2" | "basic";

export interface EcuadorProviderConfig {
  baseUrl?: string | null;
  authType: EcuadorProviderAuthType;
  token?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  timeoutMs?: number | null;
  sandboxMode: boolean;
}

export interface EcuadorProviderCredentialState {
  provider: "mock" | "delivereo";
  configured: boolean;
  credentialsPresent: boolean;
  config: EcuadorProviderConfig;
}
