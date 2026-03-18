import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AuthLoadingScreen from "./AuthLoadingScreen";

export default function RoleRoute({ allow = [], children }) {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (allow.length && !allow.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}

