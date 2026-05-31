export function formatMoney(value: number | string | null | undefined) {
  const amount =
    typeof value === "string" ? Number.parseFloat(value) : Number(value ?? 0);

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR"
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Time-of-day greeting in South African (Africa/Johannesburg) local time.
 *
 * Morning  05:00 – 11:59
 * Afternoon 12:00 – 16:59
 * Evening  17:00 – 04:59
 */
export function getGreeting(date: Date = new Date()): string {
  const hourString = date.toLocaleString("en-ZA", {
    hour: "numeric",
    hour12: false,
    timeZone: "Africa/Johannesburg"
  });
  const hour = Number.parseInt(hourString, 10);

  if (Number.isNaN(hour)) {
    return "Welcome back";
  }

  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}
