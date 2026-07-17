import { TeamDirectory } from "@/components/team-directory";
import { getCompanyContacts, getTeamMembers, getUsefulLinks } from "@/lib/data";
import { canManageTeam, requireCurrentOperationalProfile } from "@/lib/auth";
import { BlendHubTabs, type BlendHubTab } from "@/components/blendhub-tabs";
import { VacationWorkspace } from "@/components/vacation-workspace";
import { getVacationData } from "@/lib/data";

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
  const rawTab = valueOf(params, "tab");
  const activeTab: BlendHubTab = (["team", "contacts", "links", "vacations"] as const).includes(rawTab as BlendHubTab) ? rawTab as BlendHubTab : "team";
  const yearValue = Number(valueOf(params, "year")); const year = Number.isInteger(yearValue) && yearValue >= 2000 && yearValue <= 2200 ? yearValue : new Date().getFullYear();
  const createOpen = canEdit && activeTab === "team" && valueOf(params, "new") === "1";
  const [teamMembers, companyContacts, usefulLinks] = await Promise.all([
    getTeamMembers(),
    getCompanyContacts(),
    getUsefulLinks(),
  ]);
  const vacationData = activeTab === "vacations" ? await getVacationData(year, currentProfile.key) : null;

  return (
    <div className="grid gap-4"><div><h1 className="text-2xl font-black text-[var(--bb-charcoal)]">BlendHub</h1><p className="text-sm font-bold text-[var(--bb-muted)]">Equipa, recursos e férias num só lugar.</p></div><BlendHubTabs active={activeTab} />
    {activeTab !== "vacations" ? <TeamDirectory
      key={createOpen ? "create-open" : "default"}
      teamMembers={teamMembers}
      companyContacts={companyContacts}
      usefulLinks={usefulLinks}
      createOpen={createOpen}
      canEdit={canEdit}
      activeTab={activeTab}
    /> : vacationData ? <VacationWorkspace year={year} isAdmin={currentProfile.key === "guilherme"} profileKey={currentProfile.key} members={teamMembers} balances={vacationData.balances} requests={vacationData.requests} holidays={vacationData.holidays} /> : null}</div>
  );
}
