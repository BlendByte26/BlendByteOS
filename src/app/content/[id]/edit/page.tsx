import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  createContentCommentAction,
  deleteContentAction,
  deleteContentCommentAction,
  listContentCommentsAction,
  updateContentAction,
} from "@/lib/actions";
import { getClients, getContentComments, getContentItem, getTeamMembers } from "@/lib/data";
import { ContentEditorTabs } from "@/components/content-editor-tabs";
import { FormFrame } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import {
  OPERATIONAL_PROFILE_COOKIE,
  fallbackOperationalProfile,
  getOperationalProfile,
} from "@/lib/operational-profiles";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ConfirmSubmitForm } from "@/components/confirm-submit-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditContentPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const activeProfile =
    getOperationalProfile(cookieStore.get(OPERATIONAL_PROFILE_COOKIE)?.value) ??
    fallbackOperationalProfile();
  const [clients, teamMembers, item, comments] = await Promise.all([
    getClients(),
    getTeamMembers(),
    getContentItem(id),
    getContentComments(id),
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
      <FormFrame title="Editar conteúdo">
        <ContentEditorTabs
          item={item}
          clients={clients}
          teamMembers={teamMembers}
          activeProfile={activeProfile}
          canPersist={isSupabaseConfigured()}
          contentAction={updateContentAction.bind(null, item.id)}
          submitLabel="Guardar alterações"
          initialComments={comments}
          listCommentsAction={listContentCommentsAction}
          createCommentAction={createContentCommentAction}
          deleteCommentAction={deleteContentCommentAction}
          footer={
            <ConfirmSubmitForm
              action={deleteContentAction.bind(null, item.id)}
              message={`Apagar definitivamente o conteúdo "${item.title}"?\n\nEsta ação não pode ser anulada.`}
              className="mt-4 border-t border-[var(--bb-border)] pt-4"
            >
              <button type="submit" className="rounded-full px-3 py-1.5 text-sm font-bold text-[#8f2415] transition hover:bg-[var(--bb-red-soft)]">
                Apagar definitivamente
              </button>
            </ConfirmSubmitForm>
          }
        />
      </FormFrame>
    </>
  );
}
