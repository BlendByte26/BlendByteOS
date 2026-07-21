import { createClientAction } from "@/lib/actions";
import { ClientSetupFlow } from "@/components/client-setup-flow";
import { PageHeader } from "@/components/ui";
import { getClients, getTeamMembers } from "@/lib/data";
import { nextClientDisplayOrder } from "@/lib/client-profile";
import { requireRole } from "@/lib/auth";

export default async function NewClientPage() {
  await requireRole(["admin", "marketing"]);
  const [teamMembers, clients] = await Promise.all([getTeamMembers(), getClients()]);

  return (
    <>
      <PageHeader
        title="Novo cliente"
        description="Fluxo guiado para criar o perfil operacional do cliente."
      />
      <ClientSetupFlow
        action={createClientAction}
        teamMembers={teamMembers}
        nextDisplayOrder={nextClientDisplayOrder(clients)}
      />
    </>
  );
}
