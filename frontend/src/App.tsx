import { Navigate, Route, Routes } from "react-router-dom";

import { PublicLayout } from "./components/PublicLayout/PublicLayout";
import { ProtectedRoute } from "./components/ProtectedRoute/ProtectedRoute";
import { GuestOnlyRoute } from "./components/GuestOnlyRoute/GuestOnlyRoute";
import { ChampionshipPage } from "./pages/ChampionshipPage/ChampionshipPage";
import { DashboardPage } from "./pages/DashboardPage/DashboardPage";
import { HomePage } from "./pages/HomePage/HomePage";
import { LoginPage } from "./pages/LoginPage/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage/RegisterPage";

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route element={<GuestOnlyRoute />}>
          <Route path="entrar" element={<LoginPage />} />
          <Route path="cadastro" element={<RegisterPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="painel" element={<DashboardPage />} />
          <Route path="perfil" element={<ProfilePage />} />
        </Route>
        <Route
          path="campeonatos/demo"
          element={<ChampionshipPage />}
        />
        <Route path="inicio" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
