import type { ContentItem } from "./types";

const monthLabelFormatter = new Intl.DateTimeFormat("pt-PT", {
  month: "long",
  year: "numeric",
});

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function isValidContentMonth(value: string | undefined | null) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

export function contentMonthRange(month: string) {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 12));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 12));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function isPublishDateInMonth(publishDate: string | null, month: string) {
  return publishDate?.startsWith(`${month}-`) ?? false;
}

export function publishMonth(item: Pick<ContentItem, "publish_date">) {
  return item.publish_date?.slice(0, 7) ?? "";
}

export function formatContentMonthLabel(month: string) {
  if (!isValidContentMonth(month)) return month;
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  return capitalize(monthLabelFormatter.format(new Date(year, monthIndex, 1)));
}

export function currentLisbonContentMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : date.toISOString().slice(0, 7);
}
