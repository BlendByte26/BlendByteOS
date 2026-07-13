type BrandLogoProps = {
  variant?: "wordmark" | "square";
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

const brandLogoPaths = {
  wordmark: "/brand/blendbyteos-logo.png",
  square: "/brand/blendbyteos-icon.png",
};

export function BrandLogo({
  variant = "wordmark",
  className = "",
  imageClassName = "",
  priority = false,
}: BrandLogoProps) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-black ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={brandLogoPaths[variant]}
        alt="BlendByteOS"
        className={`h-full w-full object-contain ${imageClassName}`}
        loading={priority ? "eager" : "lazy"}
      />
    </span>
  );
}
