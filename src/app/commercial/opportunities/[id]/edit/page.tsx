import Link from "next/link";
import { notFound } from "next/navigation";
import { CommercialOpportunityForm } from "@/components/commercial-forms";
import { PageHeader, Panel } from "@/components/ui";
import { requireCommercialAccess } from "@/lib/auth";
import { updateCommercialOpportunityAction } from "@/lib/commercial-actions";
import { getCommercialOpportunity } from "@/lib/commercial-data";
import { getClients } from "@/lib/data";

export default async function EditCommercialOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCommercialAccess();
  const { id } = await params;
  const [opportunity, clients] = await Promise.all([
    getCommercialOpportunity(id),
    getClients(),
  ]);
  if (!opportunity) notFound();

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Editar oportunidade"
        description={opportunity.company_name}
        action={
          <div className="flex flex-wrap gap-2">
            {opportunity.client_id ? (
              <Link
                href={`/clients/${opportunity.client_id}`}
                className="inline-flex min-h-10 items-center rounded-full bg-[var(--bb-primary)] px-4 text-sm font-extrabold"
              >
                Abrir cliente
              </Link>
            ) : null}
            <Link
              href="/commercial?tab=opportunities"
              className="inline-flex min-h-10 items-center rounded-full border border-[var(--bb-border)] bg-white/65 px-4 text-sm font-extrabold"
            >
              Voltar
            </Link>
          </div>
        }
      />
      <Panel className="p-5">
        <CommercialOpportunityForm
          opportunity={opportunity}
          clients={clients}
          action={updateCommercialOpportunityAction.bind(null, opportunity.id)}
        />
      </Panel>
    </div>
  );
}
