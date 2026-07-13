"use client";

import { useState } from "react";
import { ExternalLink, Link as LinkIcon, Plus, Trash2 } from "lucide-react";
import { isHttpUrl, linkDisplayLabel } from "@/lib/links";
import type { LinkItem } from "@/lib/types";

const inputClass = "bb-input text-sm font-semibold";

function emptyLink(): LinkItem {
  return { label: "", url: "" };
}

export function LinksEditor({ links = [] }: { links?: LinkItem[] | null }) {
  const initialLinks = links ?? [];
  const [items, setItems] = useState<LinkItem[]>(initialLinks.length ? initialLinks : []);

  function updateLink(index: number, patch: Partial<LinkItem>) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function removeLink(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <section className="grid gap-2 rounded-[18px] border border-[var(--bb-border)] bg-white/35 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-[var(--bb-muted)]">
          <LinkIcon className="size-3.5" aria-hidden="true" />
          Links
        </div>
        <button
          type="button"
          onClick={() => setItems((current) => [...current, emptyLink()])}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--bb-border)] bg-white/70 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Adicionar link
        </button>
      </div>

      {items.length ? (
        <div className="grid gap-2">
          {items.map((item, index) => (
            <div key={index} className="grid gap-2 rounded-[14px] border border-[var(--bb-border)] bg-white/55 p-2 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.25fr)_auto]">
              <label className="grid gap-1 text-xs font-extrabold uppercase text-[var(--bb-muted)]">
                Nome
                <input
                  name="link_label"
                  value={item.label ?? ""}
                  onChange={(event) => updateLink(index, { label: event.target.value })}
                  placeholder="Brief no Drive"
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1 text-xs font-extrabold uppercase text-[var(--bb-muted)]">
                URL
                <input
                  name="link_url"
                  type="url"
                  required
                  pattern="https?://.+"
                  title="Usa um URL começado por http:// ou https://"
                  value={item.url}
                  onChange={(event) => updateLink(index, { url: event.target.value })}
                  placeholder="https://..."
                  className={inputClass}
                />
              </label>
              <div className="flex items-end gap-1.5">
                {isHttpUrl(item.url) ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Abrir link"
                    title="Abrir link"
                    className="grid size-10 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                  >
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeLink(index)}
                  aria-label="Remover link"
                  title="Remover link"
                  className="grid size-10 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[#a73522] transition hover:bg-[var(--bb-red-soft)]"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[14px] border border-dashed border-[var(--bb-border)] bg-white/35 px-3 py-3 text-xs font-bold text-[var(--bb-muted)]">
          Sem links.
        </div>
      )}
    </section>
  );
}

export function LinksList({ links = [] }: { links?: LinkItem[] | null }) {
  if (!links?.length) return null;

  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {links.map((link, index) => (
        <a
          key={`${link.url}-${index}`}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
        >
          <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{linkDisplayLabel(link)}</span>
        </a>
      ))}
    </div>
  );
}

export function LinksIndicator({ links = [] }: { links?: LinkItem[] | null }) {
  if (!links?.length) return null;

  return (
    <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-[var(--bb-border)] bg-white/65 px-2 text-[11px] font-extrabold text-[var(--bb-muted)]">
      <LinkIcon className="size-3" aria-hidden="true" />
      {links.length}
    </span>
  );
}
