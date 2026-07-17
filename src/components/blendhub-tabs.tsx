"use client";
import Link from "next/link";
export type BlendHubTab = "team" | "contacts" | "links" | "vacations";
const tabs: Array<[BlendHubTab, string]> = [["team", "Equipa"], ["contacts", "Contactos gerais"], ["links", "Links úteis"], ["vacations", "Férias"]];
export function BlendHubTabs({ active }: { active: BlendHubTab }) {
  return <nav aria-label="Secções do BlendHub" className="overflow-x-auto pb-1"><div className="flex w-max min-w-full gap-1 rounded-full border border-[var(--bb-border)] bg-white/55 p-1.5">{tabs.map(([key, label]) => <Link key={key} href={`/team?tab=${key}`} scroll={false} aria-current={active === key ? "page" : undefined} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-extrabold transition ${active === key ? "bg-[var(--bb-primary)] text-[var(--bb-black)] shadow-[0_8px_20px_rgba(83,183,223,0.22)]" : "text-[var(--bb-muted)] hover:bg-[var(--bb-primary-soft)]"}`}>{label}</Link>)}</div></nav>;
}
