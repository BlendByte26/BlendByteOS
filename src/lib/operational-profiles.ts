import type { AppAccessView } from "./app-access";

export const OPERATIONAL_PROFILE_COOKIE = "bb_operational_profile";

export const operationalProfiles = {
  carlota: {
    key: "carlota",
    name: "Carlota",
    role: "Design",
    defaultView: "design",
  },
  sofia: {
    key: "sofia",
    name: "Sofia",
    role: "Marketing / Client Ops",
    defaultView: "marketing",
  },
  guilherme: {
    key: "guilherme",
    name: "Guilherme",
    role: "Gestão / Operações",
    defaultView: "marketing",
    canSeeAll: true,
  },
} as const satisfies Record<
  string,
  {
    key: string;
    name: string;
    role: string;
    defaultView: AppAccessView;
    canSeeAll?: boolean;
  }
>;

export type OperationalProfileKey = keyof typeof operationalProfiles;
export type OperationalProfile = (typeof operationalProfiles)[OperationalProfileKey];

export function isOperationalProfileKey(value: string | null | undefined): value is OperationalProfileKey {
  return Boolean(value && value in operationalProfiles);
}

export function getOperationalProfile(value: string | null | undefined) {
  return isOperationalProfileKey(value) ? operationalProfiles[value] : null;
}

export function fallbackOperationalProfile() {
  return operationalProfiles.guilherme;
}
