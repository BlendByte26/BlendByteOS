import { TeamDirectory } from "@/components/team-directory";
import { getCompanyContacts, getTeamMembers } from "@/lib/data";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function TeamPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const createOpen = valueOf(params, "new") === "1";
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
    />
  );
}
