import { Navigate, Route, Routes } from "react-router-dom";

import { PublicLayout } from "./components/PublicLayout/PublicLayout";
import { ProtectedRoute } from "./components/ProtectedRoute/ProtectedRoute";
import { GuestOnlyRoute } from "./components/GuestOnlyRoute/GuestOnlyRoute";
import { AdminMatchPage } from "./pages/AdminMatchPage/AdminMatchPage";
import { ChampionshipPage } from "./pages/ChampionshipPage/ChampionshipPage";
import { DashboardPage } from "./pages/DashboardPage/DashboardPage";
import { CreateChampionshipPage } from "./pages/CreateChampionshipPage/CreateChampionshipPage";
import { HomePage } from "./pages/HomePage/HomePage";
import { LoginPage } from "./pages/LoginPage/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage/ProfilePage";
import { OrganizerChampionshipPage } from "./pages/OrganizerChampionshipPage/OrganizerChampionshipPage";
import { EditChampionshipPage } from "./pages/EditChampionshipPage/EditChampionshipPage";
import { ManageParticipantsPage } from "./pages/ManageParticipantsPage/ManageParticipantsPage";
import { ManageMatchesPage } from "./pages/ManageMatchesPage/ManageMatchesPage";
import { PublicMatchPage } from "./pages/PublicMatchPage/PublicMatchPage";
import { ExploreChampionshipsPage } from "./pages/ExploreChampionshipsPage/ExploreChampionshipsPage";
import { PublicPlayerPage } from "./pages/PublicPlayerPage/PublicPlayerPage";
import { PublicTeamPage } from "./pages/PublicTeamPage/PublicTeamPage";
import { PublicPlayerHistoryPage } from "./pages/PublicPlayerHistoryPage/PublicPlayerHistoryPage";
import { PublicOrganizerPage } from "./pages/PublicOrganizerPage/PublicOrganizerPage";
import { PublicClubPage } from "./pages/PublicClubPage/PublicClubPage";
import { RegisterPage } from "./pages/RegisterPage/RegisterPage";
import { ClubsPage } from "./pages/ClubsPage/ClubsPage";
import { NotificationsPage } from "./pages/NotificationsPage/NotificationsPage";

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
          <Route path="painel/clubes" element={<ClubsPage />} />
          <Route path="painel/notificacoes" element={<NotificationsPage />} />
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
          <Route
            path="painel/campeonatos/:id/participantes"
            element={<ManageParticipantsPage />}
          />
          <Route
            path="painel/campeonatos/:id/partidas"
            element={<ManageMatchesPage />}
          />
          <Route
            path="painel/campeonatos/:id/partidas/:matchId"
            element={<AdminMatchPage />}
          />
        </Route>
        <Route path="campeonatos" element={<ExploreChampionshipsPage />} />
        <Route path="campeonatos/:slug" element={<ChampionshipPage />} />
        <Route path="campeonatos/:slug/jogadores/:memberId" element={<PublicPlayerPage />} />
        <Route path="campeonatos/:slug/equipes/:teamId" element={<PublicTeamPage />} />
        <Route path="jogadores/:memberId/historico" element={<PublicPlayerHistoryPage />} />
        <Route path="organizadores/:organizerId" element={<PublicOrganizerPage />} />
        <Route path="clubes/:clubId" element={<PublicClubPage />} />
        <Route
          path="campeonatos/:slug/partidas/:matchId"
          element={<PublicMatchPage />}
        />
        <Route path="inicio" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
