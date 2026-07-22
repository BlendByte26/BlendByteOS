import { createContentAction } from "@/lib/actions";
import { getClients, getTask, getTeamMembers } from "@/lib/data";
import { ContentForm, FormFrame } from "@/components/forms";
import { requireRole } from "@/lib/auth";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewContentPage({ searchParams }: Props) {
  await requireRole(["admin", "marketing", "design"]);
  const params = (await searchParams) ?? {};
  const sourceTaskId = valueOf(params, "sourceTaskId");
  const [clients, teamMembers, sourceTask] = await Promise.all([
    getClients(),
    getTeamMembers(),
    sourceTaskId ? getTask(sourceTaskId) : Promise.resolve(null),
  ]);
  const defaultClientId = sourceTask?.client_id ?? valueOf(params, "client");

  return (
    <FormFrame title="Dados do conteúdo">
      <ContentForm
        action={createContentAction}
        clients={clients}
        teamMembers={teamMembers}
        defaultClientId={defaultClientId}
        defaultTitle={sourceTask?.title}
        defaultCreativeBrief={sourceTask?.notes ?? undefined}
        sourceTaskId={sourceTask?.id}
        submitLabel="Criar conteúdo"
      />
    </FormFrame>
  );
}
