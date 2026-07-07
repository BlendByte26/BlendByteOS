import { cookies } from "next/headers";
import { TeamDirectory } from "@/components/team-directory";
import { getCompanyContacts, getTeamMembers } from "@/lib/data";
import {
  OPERATIONAL_PROFILE_COOKIE,
  getOperationalProfile,
} from "@/lib/operational-profiles";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function TeamPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const currentProfile = getOperationalProfile(cookieStore.get(OPERATIONAL_PROFILE_COOKIE)?.value);
  const canEdit = currentProfile?.key === "guilherme";
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
