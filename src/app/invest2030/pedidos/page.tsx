import Link from "next/link";
import { EmptyState, Panel, TableWrap } from "@/components/ui";
import { Invest2030InvalidAccess, Invest2030PublicShell } from "@/components/invest2030-public-shell";
import { getInvest2030Requests, uniqueValues } from "@/lib/data";
import { invest2030PublicHref, isInvest2030PublicAccessToken } from "@/lib/invest2030-public";
import {
  invest2030ActionTypes,
  invest2030InformationStatuses,
  invest2030MainGoals,
  invest2030Requesters,
} from "@/lib/types";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function selectOptions(values: readonly string[], fallbackValues: string[] = []) {
  return Array.from(new Set([...values, ...fallbackValues])).map((value) => ({
    value,
    label: value,
  }));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Lisbon",
  }).format(new Date(value));
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-extrabold uppercase text-[var(--bb-muted)]">
      {label}
      <select name={name} defaultValue={value} className="bb-input w-full text-sm font-bold normal-case text-[var(--bb-charcoal)]">
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function Invest2030RequestsPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const accessToken = valueOf(params, "access") ?? "";
  if (!isInvest2030PublicAccessToken(accessToken)) {
    return <Invest2030InvalidAccess />;
  }

  const filters = {
    search: valueOf(params, "search") ?? "",
    actionType: valueOf(params, "action_type") ?? "",
    requestedBy: valueOf(params, "requested_by") ?? "",
    mainGoal: valueOf(params, "main_goal") ?? "",
    informationStatus: valueOf(params, "information_status") ?? "",
    month: valueOf(params, "month") ?? "",
  };
  const [requests, allRequests] = await Promise.all([
    getInvest2030Requests(filters),
    getInvest2030Requests(),
  ]);
  const created = valueOf(params, "created") === "1";

  return (
    <Invest2030PublicShell accessToken={accessToken} active="history">
      {created ? (
        <div className="mb-5 rounded-[18px] border border-[rgba(83,183,223,0.38)] bg-[var(--bb-primary-soft)] px-4 py-3 text-sm font-extrabold text-[var(--bb-charcoal)]">
          Pedido enviado com sucesso.
        </div>
      ) : null}

      <Panel className="mb-5 p-3.5">
        <form className="grid min-w-0 gap-3">
          <input type="hidden" name="access" value={accessToken} />
          <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="grid min-w-0 gap-1 text-xs font-extrabold uppercase text-[var(--bb-muted)]">
              Pesquisa
              <input
                name="search"
                defaultValue={filters.search}
                placeholder="Campanha, tema, CTA, comercial..."
                className="bb-input w-full text-sm font-bold normal-case"
              />
            </label>
            <div className="min-w-0">
              <FilterSelect
                name="action_type"
                label="Tipo de ação"
                value={filters.actionType}
                options={selectOptions(invest2030ActionTypes, uniqueValues(allRequests, (request) => request.action_type))}
              />
            </div>
            <div className="min-w-0">
              <FilterSelect
                name="requested_by"
                label="Quem pediu"
                value={filters.requestedBy}
                options={selectOptions(invest2030Requesters, uniqueValues(allRequests, (request) => request.requested_by))}
              />
            </div>
            <div className="min-w-0">
              <FilterSelect
                name="main_goal"
                label="Objetivo"
                value={filters.mainGoal}
                options={selectOptions(invest2030MainGoals, uniqueValues(allRequests, (request) => request.main_goal))}
              />
            </div>
            <div className="min-w-0">
              <FilterSelect
                name="information_status"
                label="Estado info"
                value={filters.informationStatus}
                options={selectOptions(invest2030InformationStatuses, uniqueValues(allRequests, (request) => request.information_status))}
              />
            </div>
            <label className="grid min-w-0 gap-1 text-xs font-extrabold uppercase text-[var(--bb-muted)]">
              Mês/ano
              <input name="month" type="month" defaultValue={filters.month} className="bb-input w-full min-w-0 text-sm font-bold normal-case" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="min-h-11 rounded-full bg-[var(--bb-black)] px-4 text-sm font-bold text-white transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
            >
              Filtrar
            </button>
            <Link
              href={invest2030PublicHref("/invest2030/pedidos", accessToken)}
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--bb-border)] bg-white/65 px-4 text-sm font-bold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
            >
              Limpar
            </Link>
          </div>
        </form>
      </Panel>

      <Panel className="p-3.5">
        {requests.length ? (
          <TableWrap>
            <table className="min-w-[1320px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--bb-border)] text-xs font-extrabold uppercase text-[var(--bb-muted)]">
                  <th className="px-3 py-3">Data do pedido</th>
                  <th className="px-3 py-3">Tipo de ação</th>
                  <th className="px-3 py-3">Nome da campanha</th>
                  <th className="px-3 py-3">Período</th>
                  <th className="px-3 py-3">Quem pediu</th>
                  <th className="px-3 py-3">Objetivo principal</th>
                  <th className="px-3 py-3">Estado da informação</th>
                  <th className="px-3 py-3">Texto do botão</th>
                  <th className="px-3 py-3">Link do botão</th>
                  <th className="px-3 py-3">Tema</th>
                  <th className="px-3 py-3">Informação obrigatória</th>
                  <th className="px-3 py-3">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bb-border)]">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-3 py-3 text-xs font-bold text-[var(--bb-muted)]">{formatDateTime(request.created_at)}</td>
                    <td className="px-3 py-3 font-bold text-[var(--bb-charcoal)]">{request.action_type}</td>
                    <td className="px-3 py-3 font-extrabold text-[var(--bb-charcoal)]">
                      <span className="bb-line-clamp-2">{request.campaign_name}</span>
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-[var(--bb-muted)]">{request.period_label}</td>
                    <td className="px-3 py-3 font-bold text-[var(--bb-charcoal)]">{request.requested_by}</td>
                    <td className="px-3 py-3 text-xs font-bold text-[var(--bb-muted)]">{request.main_goal}</td>
                    <td className="px-3 py-3 text-xs font-bold text-[var(--bb-muted)]">{request.information_status}</td>
                    <td className="px-3 py-3 text-xs font-bold text-[var(--bb-muted)]">
                      <span className="bb-line-clamp-2">{request.main_cta}</span>
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-[var(--bb-muted)]">
                      <span className="bb-line-clamp-2">{request.main_link ?? "Sem link"}</span>
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-[var(--bb-muted)]">
                      <span className="bb-line-clamp-2">{request.main_message}</span>
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-[var(--bb-muted)]">
                      <span className="bb-line-clamp-2">{request.mandatory_info}</span>
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-[var(--bb-muted)]">
                      <span className="bb-line-clamp-2">{request.notes ?? "Sem observações"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="Ainda não existem pedidos Invest2030." />
        )}
      </Panel>
    </Invest2030PublicShell>
  );
}
