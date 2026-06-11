const MEDIA_MAIL_SERVICE_CODES = new Set([
  "usps_media_mail",
]);

const ELIGIBLE_MEDIA_MAIL_PATTERNS = [
  /\bbook(s)?\b/i,
  /\btextbook(s)?\b/i,
  /\bnovel(s)?\b/i,
  /\bmanual(s)?\b/i,
  /\bmagazine(s)?\b/i,
  /\bcomic(s)?\b/i,
  /\bcatalog(s)?\b/i,
  /\bprinted\b/i,
  /\beducational\b/i,
  /\bworksheet(s)?\b/i,
  /\bmedia\b/i,
  /\bcd(s)?\b/i,
  /\bdvd(s)?\b/i,
  /\bvinyl\b/i,
  /\bblu[- ]?ray\b/i,
  /\baudio ?book(s)?\b/i,
];

const INELIGIBLE_MEDIA_MAIL_PATTERNS = [
  /\bapparel\b/i,
  /\bclothes?\b/i,
  /\bclothing\b/i,
  /\baccessor(y|ies)\b/i,
  /\bmerch(andise)?\b/i,
  /\bgeneral\b/i,
  /\bshoe(s)?\b/i,
  /\bfashion\b/i,
  /\bhome goods?\b/i,
  /\bcosmetic(s)?\b/i,
  /\belectronic(s)?\b/i,
  /\btoy(s)?\b/i,
];

export const MEDIA_MAIL_ACTION_REQUIRED_MESSAGE =
  "Payment confirmed. USPS Media Mail is only available for eligible media products. Please choose another service or contact support.";

export const RATE_EXPIRED_ACTION_REQUIRED_MESSAGE =
  "Payment confirmed. The selected carrier rate changed before the label could be completed. Please refresh rates or contact support.";

export function isMediaMailServiceCode(serviceCode?: string | null): boolean {
  return MEDIA_MAIL_SERVICE_CODES.has((serviceCode ?? "").trim().toLowerCase());
}

export function isEligibleMediaMailProduct(productDescription?: string | null): boolean {
  const description = productDescription?.trim();
  if (!description) return false;

  if (INELIGIBLE_MEDIA_MAIL_PATTERNS.some((pattern) => pattern.test(description))) {
    return false;
  }

  return ELIGIBLE_MEDIA_MAIL_PATTERNS.some((pattern) => pattern.test(description));
}

export function shouldBlockMediaMailRate(
  serviceCode?: string | null,
  productDescription?: string | null,
): boolean {
  return isMediaMailServiceCode(serviceCode) && !isEligibleMediaMailProduct(productDescription);
}
