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
  return (
    <span className={className} aria-hidden="true">
      {logoPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoPath} alt="" className={imageClassName} />
      ) : (
        <span>{fallback}</span>
      )}
    </span>
  );
}
