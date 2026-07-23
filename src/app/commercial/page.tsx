import Link from "next/link";
import { BookOpen, BriefcaseBusiness, FileText, Pencil, Plus } from "lucide-react";
import {
  CommercialOpportunityForm,
  CommercialQuoteForm,
  CommercialServiceForm,
} from "@/components/commercial-forms";
import { EmptyState, PageHeader, Panel, TableWrap } from "@/components/ui";
import {
  createCommercialOpportunityAction,
  createCommercialQuoteAction,
  createCommercialServiceAction,
} from "@/lib/commercial-actions";
import { getCommercialWorkspaceData } from "@/lib/commercial-data";
import {
  commercialOpportunitySourceLabels,
  commercialOpportunityStatusLabels,
  commercialQuoteStatusLabels,
  commercialServicePriceStatusLabels,
  commercialStatusTone,
  formatCommercialMoney,
  groupCommercialServices,
} from "@/lib/commercial";
import { getClients } from "@/lib/data";
import { requireCommercialAccess } from "@/lib/auth";

type CommercialTab = "opportunities" | "catalog" | "quotes";

function isCommercialTab(value: string | undefined): value is CommercialTab {
  return ["opportunities", "catalog", "quotes"].includes(value ?? "");
}

const tabs = [
  { value: "opportunities", label: "Oportunidades", icon: BriefcaseBusiness },
  { value: "catalog", label: "Catálogo", icon: BookOpen },
  { value: "quotes", label: "Orçamentos", icon: FileText },
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  }).format(new Date(value));
}

function CommercialTabs({ selected }: { selected: CommercialTab }) {
  return (
    <nav
      aria-label="Áreas comerciais"
      className="grid gap-2 rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.07)] sm:grid-cols-3"
    >
      {tabs.map((tab) => {
        const active = selected === tab.value;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.value}
            href={`/commercial?tab=${tab.value}`}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${
              active
                ? "bg-[var(--bb-primary)] text-[var(--bb-black)] shadow-[0_10px_24px_rgba(83,183,223,0.24)]"
                : "bg-white/45 text-[var(--bb-muted)] hover:bg-[var(--bb-primary-hover)] hover:text-[var(--bb-black)]"
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default async function CommercialPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireCommercialAccess();
  const params = await searchParams;
  const selectedTab: CommercialTab = isCommercialTab(params.tab) ? params.tab : "opportunities";
  const [workspace, clients] = await Promise.all([getCommercialWorkspaceData(), getClients()]);
  const catalogGroups = groupCommercialServices(workspace.services);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Comercial"
        description="Catálogo-base, oportunidades e orçamentos. Durante o teste, esta área é exclusiva do perfil Guilherme."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <div className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--bb-muted)]">Oportunidades ativas</div>
          <div className="mt-2 text-3xl font-extrabold">
            {workspace.opportunities.filter((item) => !["won", "lost"].includes(item.status)).length}
          </div>
        </Panel>
        <Panel className="p-4">
          <div className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--bb-muted)]">Serviços no catálogo</div>
          <div className="mt-2 text-3xl font-extrabold">
            {workspace.services.filter((item) => item.active).length}
          </div>
        </Panel>
        <Panel className="p-4">
          <div className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--bb-muted)]">Orçamentos em curso</div>
          <div className="mt-2 text-3xl font-extrabold">
            {workspace.quotes.filter((item) => ["ready", "sent"].includes(item.status)).length}
          </div>
        </Panel>
      </div>

      <CommercialTabs selected={selectedTab} />

      {!workspace.schemaReady ? (
        <Panel className="border-[rgba(232,76,49,0.28)] bg-[var(--bb-red-soft)] p-5 text-[#8f2415]">
          <h2 className="font-extrabold">A área Comercial ainda não está instalada na base de dados.</h2>
          <p className="mt-1 text-sm font-bold">
            Aplica a migração comercial para carregar o catálogo v0.1 e começar os testes.
          </p>
        </Panel>
      ) : null}

      {selectedTab === "opportunities" ? (
        <div className="grid gap-4">
          <Panel>
            {workspace.opportunities.length ? (
              <TableWrap>
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead className="bg-[rgba(246,248,250,0.9)] text-xs uppercase text-[var(--bb-muted)]">
                    <tr>
                      <th className="px-5 py-4 font-extrabold">Empresa</th>
                      <th className="px-5 py-4 font-extrabold">Origem</th>
                      <th className="px-5 py-4 font-extrabold">Estado</th>
                      <th className="px-5 py-4 font-extrabold">Financiamento</th>
                      <th className="px-5 py-4 font-extrabold">Ligação ao OS</th>
                      <th className="px-5 py-4 font-extrabold">Criada</th>
                      <th className="px-3 py-4 font-extrabold">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--bb-border)]">
                    {workspace.opportunities.map((opportunity) => (
                      <tr key={opportunity.id}>
                        <td className="px-5 py-4">
                          <div className="font-extrabold">{opportunity.company_name}</div>
                          <div className="mt-1 text-xs font-bold text-[var(--bb-muted)]">
                            {opportunity.contact_name || opportunity.contact_email || "Sem contacto registado"}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-bold text-[var(--bb-muted)]">
                          {commercialOpportunitySourceLabels[opportunity.source]}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${commercialStatusTone(opportunity.status)}`}>
                            {commercialOpportunityStatusLabels[opportunity.status]}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {opportunity.is_funded ? (
                            <div>
                              <div className="font-extrabold">{opportunity.funding_program || "Financiado"}</div>
                              <div className="mt-1 text-xs font-bold text-[var(--bb-muted)]">
                                {formatCommercialMoney(opportunity.eligible_marketing_budget)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[var(--bb-muted)]">Direto</span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-bold text-[var(--bb-muted)]">
                          {opportunity.clients?.name ?? "Ainda não é cliente"}
                        </td>
                        <td className="px-5 py-4 text-xs font-bold text-[var(--bb-muted)]">
                          {formatDate(opportunity.created_at)}
                        </td>
                        <td className="px-3 py-4">
                          <Link
                            href={`/commercial/opportunities/${opportunity.id}/edit`}
                            aria-label={`Editar ${opportunity.company_name}`}
                            className="inline-grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white hover:bg-[var(--bb-primary-soft)]"
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <EmptyState title="Ainda não existem oportunidades comerciais." />
            )}
          </Panel>

          {workspace.schemaReady ? (
            <Panel className="p-5">
              <details open={!workspace.opportunities.length} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-extrabold">
                  <Plus className="size-4" aria-hidden="true" />
                  Nova oportunidade
                </summary>
                <div className="mt-5 border-t border-[var(--bb-border)] pt-5">
                  <CommercialOpportunityForm action={createCommercialOpportunityAction} clients={clients} />
                </div>
              </details>
            </Panel>
          ) : null}
        </div>
      ) : null}

      {selectedTab === "catalog" ? (
        <div className="grid gap-4">
          <Panel className="p-4">
            <p className="text-sm font-bold text-[var(--bb-muted)]">
              Os preços v0.1 começaram em rascunho. Aprova cada serviço apenas depois de validar capacidade, custos e margem.
            </p>
          </Panel>
          <div className="grid gap-3">
            {workspace.services.length ? (
              catalogGroups.map((group, index) => (
                <Panel key={group.category} className="overflow-hidden">
                  <details open={index === 0}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-extrabold">
                      <span>{group.category}</span>
                      <span className="rounded-full bg-[var(--bb-primary-soft)] px-2.5 py-1 text-xs text-[var(--bb-muted)]">
                        {group.services.length} {group.services.length === 1 ? "serviço" : "serviços"}
                      </span>
                    </summary>
                    <div className="border-t border-[var(--bb-border)]">
                      <TableWrap>
                        <table className="w-full min-w-[820px] text-left text-sm">
                          <thead className="bg-[rgba(246,248,250,0.9)] text-xs uppercase text-[var(--bb-muted)]">
                            <tr>
                              <th className="px-5 py-4 font-extrabold">Serviço</th>
                              <th className="px-5 py-4 font-extrabold">Preço-base</th>
                              <th className="px-5 py-4 font-extrabold">Mínimo</th>
                              <th className="px-5 py-4 font-extrabold">Versão</th>
                              <th className="px-5 py-4 font-extrabold">Estado</th>
                              <th className="px-3 py-4 font-extrabold">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--bb-border)]">
                            {group.services.map((service) => (
                              <tr key={service.id} className={!service.active ? "opacity-55" : ""}>
                                <td className="px-5 py-4">
                                  <div className="font-extrabold">{service.name}</div>
                                  <div className="mt-1 text-xs font-bold text-[var(--bb-muted)]">
                                    {service.code} · por {service.unit}
                                  </div>
                                </td>
                                <td className="px-5 py-4 font-extrabold">{formatCommercialMoney(service.standard_price)}</td>
                                <td className="px-5 py-4 font-bold text-[var(--bb-muted)]">{formatCommercialMoney(service.minimum_price)}</td>
                                <td className="px-5 py-4 font-bold text-[var(--bb-muted)]">{service.version_label}</td>
                                <td className="px-5 py-4">
                                  <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${commercialStatusTone(service.price_status)}`}>
                                    {commercialServicePriceStatusLabels[service.price_status]}
                                  </span>
                                </td>
                                <td className="px-3 py-4">
                                  <Link
                                    href={`/commercial/services/${service.id}/edit`}
                                    aria-label={`Editar ${service.name}`}
                                    className="inline-grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white hover:bg-[var(--bb-primary-soft)]"
                                  >
                                    <Pencil className="size-4" aria-hidden="true" />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </TableWrap>
                    </div>
                  </details>
                </Panel>
              ))
            ) : (
              <Panel>
                <EmptyState title="O catálogo ainda não tem serviços." />
              </Panel>
            )}
          </div>

          {workspace.schemaReady ? (
            <Panel className="p-5">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-extrabold">
                  <Plus className="size-4" aria-hidden="true" />
                  Novo serviço
                </summary>
                <div className="mt-5 border-t border-[var(--bb-border)] pt-5">
                  <CommercialServiceForm action={createCommercialServiceAction} />
                </div>
              </details>
            </Panel>
          ) : null}
        </div>
      ) : null}

      {selectedTab === "quotes" ? (
        <div className="grid gap-4">
          <Panel>
            {workspace.quotes.length ? (
              <TableWrap>
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-[rgba(246,248,250,0.9)] text-xs uppercase text-[var(--bb-muted)]">
                    <tr>
                      <th className="px-5 py-4 font-extrabold">Referência</th>
                      <th className="px-5 py-4 font-extrabold">Empresa</th>
                      <th className="px-5 py-4 font-extrabold">Título</th>
                      <th className="px-5 py-4 font-extrabold">Estado</th>
                      <th className="px-5 py-4 font-extrabold">Criado</th>
                      <th className="px-3 py-4 font-extrabold">Abrir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--bb-border)]">
                    {workspace.quotes.map((quote) => (
                      <tr key={quote.id}>
                        <td className="px-5 py-4 font-mono text-xs font-bold">{quote.reference}</td>
                        <td className="px-5 py-4 font-extrabold">{quote.commercial_opportunities?.company_name ?? "—"}</td>
                        <td className="px-5 py-4 font-bold text-[var(--bb-muted)]">{quote.title}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${commercialStatusTone(quote.status)}`}>
                            {commercialQuoteStatusLabels[quote.status]}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-bold text-[var(--bb-muted)]">{formatDate(quote.created_at)}</td>
                        <td className="px-3 py-4">
                          <Link
                            href={`/commercial/quotes/${quote.id}`}
                            className="inline-flex min-h-9 items-center rounded-full border border-[var(--bb-border)] bg-white px-3 text-xs font-extrabold hover:bg-[var(--bb-primary-soft)]"
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <EmptyState title="Ainda não existem orçamentos." />
            )}
          </Panel>

          {workspace.schemaReady ? (
            <Panel className="p-5">
              <details open={!workspace.quotes.length} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-extrabold">
                  <Plus className="size-4" aria-hidden="true" />
                  Novo orçamento
                </summary>
                <div className="mt-5 border-t border-[var(--bb-border)] pt-5">
                  {workspace.opportunities.length ? (
                    <CommercialQuoteForm
                      action={createCommercialQuoteAction}
                      opportunities={workspace.opportunities.filter((item) => item.status !== "lost")}
                    />
                  ) : (
                    <p className="text-sm font-bold text-[var(--bb-muted)]">
                      Cria primeiro uma oportunidade para associar o orçamento.
                    </p>
                  )}
                </div>
              </details>
            </Panel>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
