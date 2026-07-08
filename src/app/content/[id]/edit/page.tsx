import { notFound } from "next/navigation";
import { deleteContentAction, updateContentAction } from "@/lib/actions";
import { getClients, getContentItem, getTeamMembers } from "@/lib/data";
import { ContentForm, FormFrame } from "@/components/forms";
import { PageHeader } from "@/components/ui";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditContentPage({ params }: Props) {
  const { id } = await params;
  const [clients, teamMembers, item] = await Promise.all([
    getClients(),
    getTeamMembers(),
    getContentItem(id),
  ]);

  if (!item) notFound();

  return (
    <>
      <PageHeader title="Editar conteúdo" description={item.title} />
      {item.is_blocked ? (
        <div className="mb-5 rounded-[18px] border border-[rgba(232,76,49,0.28)] bg-[var(--bb-red-soft)] px-4 py-3 text-sm font-bold text-[#8f2415]">
          Bloqueado: {item.blocker_reason ?? "Motivo do bloqueio por adicionar"}
        </div>
      ) : null}
      <FormFrame title="Dados do conteúdo">
        <ContentForm
          action={updateContentAction.bind(null, item.id)}
          clients={clients}
          teamMembers={teamMembers}
          item={item}
          submitLabel="Guardar alterações"
        />
        <form action={deleteContentAction.bind(null, item.id)} className="mt-4 border-t border-[var(--bb-border)] pt-4">
          <button type="submit" className="rounded-full px-3 py-1.5 text-sm font-bold text-[#8f2415] transition hover:bg-[var(--bb-red-soft)]">
            Apagar conteúdo
          </button>
        </form>
      </FormFrame>
    </>
  );
}
