import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ImageUrlField } from "../../components/ImageUrlField/ImageUrlField";
import { RemoteImage } from "../../components/RemoteImage/RemoteImage";
import { updateProfile } from "../../features/auth/auth-api";
import {
  currentUserQueryKey,
  useCurrentUser
} from "../../features/auth/auth-query";
import { ApiError } from "../../lib/api";
import styles from "./ProfilePage.module.css";

export function ProfilePage() {
  const queryClient = useQueryClient();
  const userQuery = useCurrentUser();
  const user = userQuery.data?.user;
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl ?? "");
  }, [user]);
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(currentUserQueryKey, data);
      setErrorMessage(null);
      setMessage("Perfil atualizado com sucesso.");
    },
    onError: (error) => {
      setMessage(null);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Não foi possível atualizar o perfil."
      );
    }
  });

  if (!user) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    const formData = new FormData(event.currentTarget);

    mutation.mutate({
      displayName: String(formData.get("displayName") ?? ""),
      avatarUrl: String(formData.get("avatarUrl") ?? "") || null,
      bio: String(formData.get("bio") ?? "") || null
    });
  }

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <span>Minha conta / perfil</span>
        <h1>Sua identidade na competição.</h1>
        <p>
          Esses dados aparecerão nas áreas públicas das competições.
        </p>
      </header>

      <div className={styles.content}>
        <aside className={styles.preview}>
          <div className={styles.avatar}>
            <RemoteImage
              alt=""
              src={user.avatarUrl}
              fallback={
                <span aria-hidden="true">
                  {user.displayName.slice(0, 2).toUpperCase()}
                </span>
              }
            />
          </div>
          <strong>{user.displayName}</strong>
          <span>{user.email}</span>
          <p>{user.bio || "Sua biografia ainda está vazia."}</p>
        </aside>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Nome público
            <input
              defaultValue={user.displayName}
              maxLength={80}
              minLength={2}
              name="displayName"
              required
            />
            <small>Entre 2 e 80 caracteres.</small>
          </label>

          <ImageUrlField
            hint="Por enquanto usamos uma URL; upload virá depois."
            label="URL do avatar"
            name="avatarUrl"
            onChange={setAvatarUrl}
            placeholder="https://exemplo.com/avatar.png"
            value={avatarUrl}
          />

          <label>
            Biografia
            <textarea
              defaultValue={user.bio ?? ""}
              maxLength={240}
              name="bio"
              placeholder="Conte brevemente sua relação com o esporte."
              rows={5}
            />
            <small>Até 240 caracteres.</small>
          </label>

          {message && <p className={styles.success} role="status">{message}</p>}
          {errorMessage && (
            <p className={styles.error} role="alert">{errorMessage}</p>
          )}

          <button disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      </div>
    </section>
  );
}
