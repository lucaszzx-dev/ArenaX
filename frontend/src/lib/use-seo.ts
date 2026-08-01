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

export function useSeo(options: {
  title: string;
  description: string;
}) {
  useEffect(() => {
    document.title = options.title;
    setMeta("description", options.description);
    setProperty("og:title", options.title);
    setProperty("og:description", options.description);
    return () => {
      document.title = "ArenaX — sua competição começa aqui";
    };
  }, [options.title, options.description]);
}
