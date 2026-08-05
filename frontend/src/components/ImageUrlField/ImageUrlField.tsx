import { useId, useState } from "react";

import { isSafeImageUrl } from "../RemoteImage/is-safe-image-url";
import { RemoteImage } from "../RemoteImage/RemoteImage";
import styles from "./ImageUrlField.module.css";

type PreviewStatus = "loading" | "error";

type ImageUrlFieldProps = {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  placeholder?: string;
  hint?: string;
};

export function ImageUrlField({
  name,
  label,
  value,
  onChange,
  className,
  id,
  placeholder = "https://...",
  hint
}: ImageUrlFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const trimmed = value.trim();
  const invalid = trimmed.length > 0 && !isSafeImageUrl(trimmed);
  const [status, setStatus] = useState<PreviewStatus | null>(null);

  return (
    <div className={className ? className + " " + styles.field : styles.field}>
      <label htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        name={name}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next);
          setStatus(isSafeImageUrl(next.trim()) ? "loading" : null);
        }}
        placeholder={placeholder}
        type="url"
        value={value}
      />
      {hint && <small className={styles.hint}>{hint}</small>}
      {invalid && (
        <small className={styles.error} role="alert">
          A URL deve começar com http:// ou https://.
        </small>
      )}
      {!invalid && trimmed.length > 0 && (
        <span className={styles.preview} aria-hidden="true">
          <RemoteImage
            alt=""
            onError={() => setStatus("error")}
            onLoad={() => setStatus(null)}
            src={trimmed}
          />
          {status === "loading" && (
            <small className={styles.status}>Carregando imagem…</small>
          )}
          {status === "error" && (
            <small className={styles.status}>Não foi possível carregar a imagem.</small>
          )}
        </span>
      )}
    </div>
  );
}
