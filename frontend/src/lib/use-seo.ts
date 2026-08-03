import { useEffect } from "react";

function setMeta(name: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setProperty(property: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

const DEFAULT_TITLE = "ArenaX — sua competição começa aqui";

export type SeoOptions = {
  title: string;
  description: string;
  image?: string | null | undefined;
  url?: string | null | undefined;
  type?: string | undefined;
};

export function useSeo(options: SeoOptions) {
  useEffect(() => {
    const title = options.title;
    const description = options.description;
    const image = options.image || null;
    const url = options.url || null;

    document.title = title;
    setMeta("description", description);
    setProperty("og:title", title);
    setProperty("og:description", description);
    setProperty("og:type", options.type ?? "website");
    if (url) setProperty("og:url", url);
    if (image) {
      setProperty("og:image", image);
      setMeta("twitter:card", "summary_large_image");
    } else {
      setMeta("twitter:card", "summary");
    }
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [
    options.title,
    options.description,
    options.image,
    options.url,
    options.type
  ]);
}
