import { useState } from "react";

export type ShareStatus = "idle" | "copied" | "shared" | "error";

export function useShare() {
  const [status, setStatus] = useState<ShareStatus>("idle");

  async function share(data: { title?: string; text?: string; url?: string }) {
    const target = data.url ?? window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: target
        });
        setStatus("shared");
        return;
      } catch {
        // user cancelled or unsupported payload: fall back to copying
      }
    }
    try {
      await navigator.clipboard.writeText(target);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return { status, share };
}
