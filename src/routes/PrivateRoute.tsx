import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '@/services/auth.service';

type Props = { allowedRoles?: string[] };

export default function PrivateRoute({ allowedRoles }: Props) {
  const isAuth = authService.isAuthenticated();
  const user = authService.getUser();

  if (!isAuth) return <Navigate to="/login" replace />;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}


