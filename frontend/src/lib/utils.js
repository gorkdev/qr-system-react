import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Tarihi okunabilir formata çevirir.
 *
 * - Bugün       → "Bugün, 15:34"
 * - Dün         → "Dün, 09:12"
 * - Bu yıl      → "13 Mar, 15:34"
 * - Farklı yıl  → "13 Mar 2025, 15:34"
 */
export function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const time = d.toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  if (d >= startOfToday) {
    return `Bugün, ${time}`;
  }

  if (d >= startOfYesterday) {
    return `Dün, ${time}`;
  }

  const day = d.getDate();
  const month = d.toLocaleString("tr-TR", { month: "long" });

  if (d.getFullYear() === now.getFullYear()) {
    return `${day} ${month}, ${time}`;
  }

  return `${day} ${month} ${d.getFullYear()}, ${time}`;
}


