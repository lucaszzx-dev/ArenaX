import { Navigate, Outlet } from "react-router-dom";

import { useCurrentUser } from "../../features/auth/auth-query";

export function GuestOnlyRoute() {
  const userQuery = useCurrentUser();

  if (userQuery.data?.user) {
    return <Navigate to="/painel" replace />;
  }

  return <Outlet />;
}
