import { AuthCard } from "../../components/AuthCard/AuthCard";
import { AuthForm } from "../../components/AuthForm/AuthForm";

export function LoginPage() {
  return (
    <AuthCard
      description="Entre para administrar seus campeonatos e resultados."
      title="Bem-vindo de volta."
    >
      <AuthForm mode="login" />
    </AuthCard>
  );
}
