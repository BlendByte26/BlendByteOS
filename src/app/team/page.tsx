import { TeamDirectory } from "@/components/team-directory";
import { getTeamMembers } from "@/lib/data";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function TeamPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const teamMembers = await getTeamMembers();

  return <TeamDirectory teamMembers={teamMembers} createOpen={valueOf(params, "new") === "1"} />;
}
