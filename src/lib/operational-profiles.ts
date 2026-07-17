import type { AppAccessView } from "./app-access";

export const OPERATIONAL_PROFILE_COOKIE = "bb_operational_profile";
export const ADMIN_PREVIEW_PROFILE_COOKIE = "admin_preview_profile";

export type OperationalRole = "admin" | "marketing" | "design";

export const operationalProfiles = {
  carlota: {
    key: "carlota",
    name: "Carlota",
    role: "Design",
    authRole: "design",
    defaultView: "design",
  },
  carolina: {
    key: "carolina",
    name: "Carolina",
    role: "Design",
    authRole: "design",
    defaultView: "design",
  },
  sofia: {
    key: "sofia",
    name: "Sofia",
    role: "Marketing / Client Ops",
    authRole: "marketing",
    defaultView: "marketing",
  },
  guilherme: {
    key: "guilherme",
    name: "Guilherme",
    role: "Gestão / Operações",
    authRole: "admin",
    defaultView: "marketing",
    canSeeAll: true,
  },
} as const satisfies Record<
  string,
  {
    key: string;
    name: string;
    role: string;
    authRole: OperationalRole;
    defaultView: AppAccessView;
    canSeeAll?: boolean;
  }
>;

export type OperationalProfileKey = keyof typeof operationalProfiles;
export type OperationalProfile = {
  key: OperationalProfileKey;
  name: string;
  role: string;
  authRole: OperationalRole;
  defaultView: AppAccessView;
  canSeeAll?: boolean;
};
export type DesignProfileKey = "carlota" | "carolina";
export type PreviewProfileKey = "sofia" | "carlota" | "carolina";

export const previewProfileKeys = ["sofia", "carlota", "carolina"] as const satisfies readonly PreviewProfileKey[];

export function isPreviewProfileKey(value: string | null | undefined): value is PreviewProfileKey {
  return Boolean(value && previewProfileKeys.includes(value as PreviewProfileKey));
}

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
