import type { LinkItem } from "./types";

export function isHttpUrl(value: string) {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export function linkDisplayLabel(link: LinkItem) {
  const label = link.label?.trim();
  if (label) return label;

  try {
    return new URL(link.url).hostname.replace(/^www\./, "") || "Abrir link";
  } catch {
    return "Abrir link";
  }
}

export function normalizeLinks(value: unknown): LinkItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const url = typeof record.url === "string" ? record.url.trim() : "";
      const label = typeof record.label === "string" ? record.label.trim() : "";
      if (!url || !isHttpUrl(url)) return null;
      return label ? { label, url } : { url };
    })
    .filter((item): item is LinkItem => Boolean(item));
}

export function parseLinksFormData(formData: FormData) {
  const labels = formData.getAll("link_label");
  const urls = formData.getAll("link_url");
  const links: LinkItem[] = [];

  urls.forEach((rawUrl, index) => {
    if (typeof rawUrl !== "string") return;
    const url = rawUrl.trim();
    const rawLabel = labels[index];
    const label = typeof rawLabel === "string" ? rawLabel.trim() : "";

    if (!url && !label) return;
    if (!isHttpUrl(url)) {
      throw new Error("Usa URLs começados por http:// ou https://.");
    }

    links.push(label ? { label, url } : { url });
  });

  return links;
}
