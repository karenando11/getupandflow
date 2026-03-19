import { Navigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export function RoleRoute({ allowedRoles, children }) {
  const { user } = useAuth();

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/app" replace />;
  }

  return children;
}
