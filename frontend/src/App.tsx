import { Navigate, Route, Routes } from "react-router-dom";

import { PublicLayout } from "./components/PublicLayout/PublicLayout";
import { ProtectedRoute } from "./components/ProtectedRoute/ProtectedRoute";
import { GuestOnlyRoute } from "./components/GuestOnlyRoute/GuestOnlyRoute";
import { ChampionshipPage } from "./pages/ChampionshipPage/ChampionshipPage";
import { DashboardPage } from "./pages/DashboardPage/DashboardPage";
import { CreateChampionshipPage } from "./pages/CreateChampionshipPage/CreateChampionshipPage";
import { HomePage } from "./pages/HomePage/HomePage";
import { LoginPage } from "./pages/LoginPage/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage/ProfilePage";
import { OrganizerChampionshipPage } from "./pages/OrganizerChampionshipPage/OrganizerChampionshipPage";
import { EditChampionshipPage } from "./pages/EditChampionshipPage/EditChampionshipPage";
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
          <Route
            path="painel/campeonatos/novo"
            element={<CreateChampionshipPage />}
          />
          <Route
            path="painel/campeonatos/:id"
            element={<OrganizerChampionshipPage />}
          />
          <Route
            path="painel/campeonatos/:id/editar"
            element={<EditChampionshipPage />}
          />
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
