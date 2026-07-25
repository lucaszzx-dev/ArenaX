import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useCurrentUser } from "../../features/auth/auth-query";
import { ApiError } from "../../lib/api";
import styles from "./ProtectedRoute.module.css";

export function ProtectedRoute() {
  const location = useLocation();
  const userQuery = useCurrentUser();

  if (userQuery.isPending) {
    return (
      <div className={styles.state} role="status">
        <span aria-hidden="true" />
        Verificando sua sessão...
      </div>
    );
  }

  if (
    userQuery.error instanceof ApiError &&
    userQuery.error.status === 401
  ) {
    return (
      <Navigate
        to="/entrar"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (userQuery.isError) {
    return (
      <div className={styles.state} role="alert">
        Não foi possível confirmar sua sessão. Tente novamente.
      </div>
    );
  }

  return <Outlet />;
}
