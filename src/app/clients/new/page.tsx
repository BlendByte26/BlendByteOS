import { createClientAction } from "@/lib/actions";
import { ClientSetupFlow } from "@/components/client-setup-flow";
import { PageHeader } from "@/components/ui";
import { getTeamMembers } from "@/lib/data";

export default async function NewClientPage() {
  const teamMembers = await getTeamMembers();

  return (
    <>
      <PageHeader
        title="Novo cliente"
        description="Fluxo guiado para preparar o setup operacional do cliente."
      />
      <ClientSetupFlow action={createClientAction} teamMembers={teamMembers} />
    </>
  );
}
