import Link from "next/link";
import { notFound } from "next/navigation";
import { CommercialServiceForm } from "@/components/commercial-forms";
import { PageHeader, Panel } from "@/components/ui";
import { requireCommercialAccess } from "@/lib/auth";
import { updateCommercialServiceAction } from "@/lib/commercial-actions";
import { getCommercialService } from "@/lib/commercial-data";

export default async function EditCommercialServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCommercialAccess();
  const { id } = await params;
  const service = await getCommercialService(id);
  if (!service) notFound();

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Editar serviço"
        description={`${service.code} · ${service.name}`}
        action={
          <Link
            href="/commercial?tab=catalog"
            className="inline-flex min-h-10 items-center rounded-full border border-[var(--bb-border)] bg-white/65 px-4 text-sm font-extrabold"
          >
            Voltar ao catálogo
          </Link>
        }
      />
      <Panel className="p-5">
        <CommercialServiceForm
          service={service}
          action={updateCommercialServiceAction.bind(null, service.id)}
        />
      </Panel>
    </div>
  );
}
