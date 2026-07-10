export const INVEST2030_PUBLIC_ACCESS_PARAM = "access";

export function invest2030PublicToken() {
  return process.env.INVEST2030_PUBLIC_ACCESS_TOKEN?.trim() ?? "";
}

export function isInvest2030PublicAccessToken(value: string | null | undefined) {
  const expected = invest2030PublicToken();
  return Boolean(expected && value && value === expected);
}

export function invest2030PublicHref(pathname: "/invest2030/novo-pedido" | "/invest2030/pedidos", accessToken: string, extraParams: Record<string, string | null | undefined> = {}) {
  const params = new URLSearchParams();
  params.set(INVEST2030_PUBLIC_ACCESS_PARAM, accessToken);

  Object.entries(extraParams).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  return `${pathname}?${params.toString()}`;
}
