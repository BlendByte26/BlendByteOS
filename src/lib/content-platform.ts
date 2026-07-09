export const fallbackContentPlatform = "Sem plataforma";

export function contentPlatformParts(value: string | null | undefined) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(",")
        .map((platform) => platform.trim())
        .filter((platform) => platform && platform !== fallbackContentPlatform),
    ),
  );
}

export function displayContentPlatform(value: string | null | undefined) {
  const parts = contentPlatformParts(value);
  return parts.length ? parts.join(", ") : fallbackContentPlatform;
}
