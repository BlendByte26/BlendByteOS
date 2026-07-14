import { randomUUID } from "node:crypto";
import { Invest2030RecentRequests, Invest2030RequestForm } from "@/components/invest2030-requests";
import { Invest2030InvalidAccess, Invest2030PublicShell } from "@/components/invest2030-public-shell";
import { Panel } from "@/components/ui";
import { createInvest2030RequestAction } from "@/lib/actions";
import { getInvest2030Requests } from "@/lib/data";
import { isInvest2030PublicAccessToken } from "@/lib/invest2030-public";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function formErrorMessage(error: string | undefined) {
  if (error === "history-error") {
    return "O pedido foi criado como tarefa, mas houve um problema ao atualizar o histórico. Fala com a BlendByte.";
  }

  if (error === "task-error") {
    return "Não foi possível criar o pedido. Fala com a BlendByte para confirmarmos o que aconteceu.";
  }

  return null;
}

export default async function NewInvest2030RequestPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const accessToken = valueOf(params, "access") ?? "";
  const errorMessage = formErrorMessage(valueOf(params, "error"));

  if (!isInvest2030PublicAccessToken(accessToken)) {
    return <Invest2030InvalidAccess />;
  }

  const recentRequests = (await getInvest2030Requests()).slice(0, 8);

  return (
    <Invest2030PublicShell accessToken={accessToken} active="new">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="p-5">
          {errorMessage ? (
            <div className="mb-4 rounded-[18px] border border-[#f3c56a] bg-[#fff6dd] px-4 py-3 text-sm font-bold leading-6 text-[#6f4a00]">
              {errorMessage}
            </div>
          ) : null}
          <Invest2030RequestForm
            action={createInvest2030RequestAction}
            accessToken={accessToken}
            submissionKey={randomUUID()}
          />
        </Panel>
        <aside className="xl:sticky xl:top-28 xl:self-start">
          <Panel className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Pedidos recentes Invest2030</h2>
            </div>
            <Invest2030RecentRequests requests={recentRequests} />
          </Panel>
        </aside>
      </div>
    </Invest2030PublicShell>
  );
}
