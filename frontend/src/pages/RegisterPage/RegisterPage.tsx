import { AuthCard } from "../../components/AuthCard/AuthCard";
import { AuthForm } from "../../components/AuthForm/AuthForm";

export function RegisterPage() {
  return (
    <AuthCard
      description="Crie seu perfil e comece a organizar sua primeira competição."
      title="Entre para o ArenaX."
    >
      <AuthForm mode="register" />
    </AuthCard>
  );
}
