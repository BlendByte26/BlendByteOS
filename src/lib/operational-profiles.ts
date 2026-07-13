import type { AppAccessView } from "./app-access";

export const OPERATIONAL_PROFILE_COOKIE = "bb_operational_profile";

export const operationalProfiles = {
  carlota: {
    key: "carlota",
    name: "Carlota",
    role: "Design",
    defaultView: "design",
  },
  carolina: {
    key: "carolina",
    name: "Carolina",
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
export type DesignProfileKey = "carlota" | "carolina";

export const designProfileKeys = ["carlota", "carolina"] as const satisfies readonly DesignProfileKey[];
export const designProfiles = designProfileKeys.map((key) => operationalProfiles[key]);

export function isOperationalProfileKey(value: string | null | undefined): value is OperationalProfileKey {
  return Boolean(value && value in operationalProfiles);
}

export function isDesignProfileKey(value: string | null | undefined): value is DesignProfileKey {
  return Boolean(value && designProfileKeys.includes(value as DesignProfileKey));
}

export function getOperationalProfile(value: string | null | undefined) {
  return isOperationalProfileKey(value) ? operationalProfiles[value] : null;
}

export function getDesignProfile(value: string | null | undefined) {
  return isDesignProfileKey(value) ? operationalProfiles[value] : operationalProfiles.carlota;
}

function normalizeAssignee(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isDesignAssigneeName(assigneeName: string | null | undefined) {
  const designNames = designProfiles.map((profile) => normalizeAssignee(profile.name));

  return (
    assigneeName
      ?.split(",")
      .map((item) => normalizeAssignee(item))
      .some((item) => item === "design" || item.includes("design") || designNames.includes(item)) ?? false
  );
}

export function fallbackOperationalProfile() {
  return operationalProfiles.guilherme;
}
