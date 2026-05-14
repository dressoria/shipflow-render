export class LogisticsError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 400,
  ) {
    super(message);
    this.name = "LogisticsError";
  }
}

export class ProviderUnavailableError extends LogisticsError {
  constructor(message = "Logistics provider is unavailable.") {
    super(message, "PROVIDER_UNAVAILABLE", 503);
  }
}

export class InvalidAddressError extends LogisticsError {
  constructor(message = "Invalid shipping address.") {
    super(message, "INVALID_ADDRESS", 400);
  }
}

export class RateExpiredError extends LogisticsError {
  constructor(message = "The selected rate has expired.") {
    super(message, "RATE_EXPIRED", 409);
  }
}

export class InsufficientFundsError extends LogisticsError {
  constructor(message = "Insufficient balance.") {
    super(message, "INSUFFICIENT_FUNDS", 402);
  }
}

export class DuplicateRequestError extends LogisticsError {
  constructor(message = "Duplicate request.") {
    super(message, "DUPLICATE_REQUEST", 409);
  }
}

export class ProviderTimeoutError extends LogisticsError {
  constructor(message = "Logistics provider timed out.") {
    super(message, "PROVIDER_TIMEOUT", 504);
  }
}

export class UnsupportedProviderError extends LogisticsError {
  constructor(message = "Unsupported logistics provider.") {
    super(message, "UNSUPPORTED_PROVIDER", 400);
  }
}

export class ProviderAuthError extends LogisticsError {
  constructor(message = "Invalid or missing provider credentials.") {
    super(message, "PROVIDER_AUTH_ERROR", 401);
  }
}

export class ProviderRateLimitError extends LogisticsError {
  constructor(message = "Provider rate limit exceeded. Try again later.") {
    super(message, "PROVIDER_RATE_LIMIT", 429);
  }
}

export class InvalidPayloadError extends LogisticsError {
  constructor(message = "Invalid payload sent to logistics provider.") {
    super(message, "INVALID_PAYLOAD", 400);
  }
}
