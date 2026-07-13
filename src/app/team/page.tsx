import { TeamDirectory } from "@/components/team-directory";
import { getCompanyContacts, getTeamMembers } from "@/lib/data";
import { canManageTeam, requireCurrentOperationalProfile } from "@/lib/auth";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function TeamPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const currentProfile = await requireCurrentOperationalProfile();
  const canEdit = canManageTeam(currentProfile);
  const createOpen = canEdit && valueOf(params, "new") === "1";
  const [teamMembers, companyContacts] = await Promise.all([
    getTeamMembers(),
    getCompanyContacts(),
  ]);

  return (
    <TeamDirectory
      key={createOpen ? "create-open" : "default"}
      teamMembers={teamMembers}
      companyContacts={companyContacts}
      createOpen={createOpen}
      canEdit={canEdit}
    />
  );
}
