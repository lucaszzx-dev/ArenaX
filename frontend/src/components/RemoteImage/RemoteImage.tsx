import { useEffect, useState, type ReactNode } from "react";

import { isSafeImageUrl } from "./is-safe-image-url";

type RemoteImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  fallback?: ReactNode;
  onLoad?: () => void;
  onError?: () => void;
};

export function RemoteImage({
  src,
  alt,
  className,
  loading = "lazy",
  fallback,
  onLoad,
  onError
}: RemoteImageProps) {
  const safeSrc = isSafeImageUrl(src) ? src : null;
  const [failed, setFailed] = useState(!safeSrc);

  useEffect(() => {
    setFailed(!safeSrc);
  }, [safeSrc]);

  if (!safeSrc || failed) {
    if (fallback !== undefined) return <>{fallback}</>;
    return null;
  }

  return (
    <img
      alt={alt}
      className={className}
      loading={loading}
      onError={() => {
        setFailed(true);
        onError?.();
      }}
      onLoad={onLoad}
      src={safeSrc}
    />
  );
}
