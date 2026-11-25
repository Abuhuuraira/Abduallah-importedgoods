const numberFormatter = new Intl.NumberFormat("en-PK", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Karachi",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Karachi",
});

/** Currency symbol shown before the amount. PKR is shown as "Rs." */
export function currencyLabel(currency: string): string {
  const code = currency.trim().toUpperCase();
  if (code === "PKR" || code === "RS" || code === "RS.") return "Rs.";
  return code;
}

/** "Rs. 2,500" — or "Price on request" when no price is set. */
export function formatPrice(price: number | null | undefined, currency = "PKR"): string {
  if (price === null || price === undefined || Number.isNaN(Number(price))) {
    return "Price on request";
  }
  return `${currencyLabel(currency)} ${numberFormatter.format(Number(price))}`;
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-PK").format(n);
}
