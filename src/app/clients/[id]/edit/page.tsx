import { notFound } from "next/navigation";
import { updateClientAction } from "@/lib/actions";
import { getClient, getTeamMembers } from "@/lib/data";
import { ClientForm, FormFrame } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditClientPage({ params }: Props) {
  await requireRole(["admin"]);
  const { id } = await params;
  const [client, teamMembers] = await Promise.all([getClient(id), getTeamMembers()]);

  if (!client) notFound();

  return (
    <>
      <PageHeader title="Editar cliente" description={client.name} />
      <FormFrame title="Dados do cliente">
        <ClientForm
          action={updateClientAction.bind(null, client.id)}
          client={client}
          teamMembers={teamMembers}
          submitLabel="Guardar alterações"
        />
      </FormFrame>
    </>
  );
}
