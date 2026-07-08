import { createContentAction } from "@/lib/actions";
import { getClients, getTeamMembers } from "@/lib/data";
import { ContentForm, FormFrame } from "@/components/forms";
import { PageHeader } from "@/components/ui";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewContentPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const [clients, teamMembers] = await Promise.all([getClients(), getTeamMembers()]);
  const defaultClientId = valueOf(params, "client");

  return (
    <>
      <PageHeader title="Novo conteúdo" description="Criar item de calendário editorial." />
      <FormFrame title="Dados do conteúdo">
        <ContentForm
          action={createContentAction}
          clients={clients}
          teamMembers={teamMembers}
          defaultClientId={defaultClientId}
          submitLabel="Criar conteúdo"
        />
      </FormFrame>
    </>
  );
}
