import { Link } from "react-router-dom";

import styles from "./AuthForm.module.css";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const isRegister = mode === "register";

  return (
    <form className={styles.form}>
      {isRegister && (
        <label>
          Nome público
          <input
            autoComplete="name"
            name="displayName"
            placeholder="Como você aparecerá na arena"
            required
          />
        </label>
      )}

      <label>
        E-mail
        <input
          autoComplete="email"
          name="email"
          placeholder="voce@exemplo.com"
          required
          type="email"
        />
      </label>

      <label>
        Senha
        <input
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={8}
          name="password"
          placeholder="Mínimo de 8 caracteres"
          required
          type="password"
        />
      </label>

      <button type="submit">
        {isRegister ? "Criar minha conta" : "Entrar na ArenaX"}
      </button>

      <p>
        {isRegister ? "Já possui uma conta?" : "Ainda não possui uma conta?"}{" "}
        <Link to={isRegister ? "/entrar" : "/cadastro"}>
          {isRegister ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </form>
  );
}
