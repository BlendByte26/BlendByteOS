"use client";

import { useState } from "react";

type ClientLogoProps = {
  logoPath?: string | null;
  fallback: string;
  className?: string;
  imageClassName?: string;
};

export function ClientLogo({
  logoPath,
  fallback,
  className = "",
  imageClassName = "",
}: ClientLogoProps) {
  const [failedLogoPath, setFailedLogoPath] = useState<string | null>(null);
  const showImage = Boolean(logoPath && failedLogoPath !== logoPath);

  return (
    <span className={className} aria-hidden="true">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoPath ?? ""}
          alt=""
          className={imageClassName}
          onError={() => setFailedLogoPath(logoPath ?? null)}
        />
      ) : (
        <span>{fallback}</span>
      )}
    </span>
  );
}
