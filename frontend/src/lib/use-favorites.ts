import { useEffect, useState } from "react";

const STORAGE_KEY = "arenax:favorites";

export function getFavoriteSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function persist(slugs: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
}

export function useFavorites() {
  const [slugs, setSlugs] = useState<string[]>(() => getFavoriteSlugs());

  useEffect(() => {
    persist(slugs);
  }, [slugs]);

  function isFavorite(slug: string) {
    return slugs.includes(slug);
  }

  function toggle(slug: string) {
    setSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug]
    );
  }

  return { isFavorite, toggle, favorites: slugs };
}
