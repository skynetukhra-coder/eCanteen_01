import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export function ProtectedRoute({ allowedRoles }) {
  const userString = localStorage.getItem("user");
  
  if (!userString) {
    // User is not logged in -> Redirect to login page
    return <Navigate to="/login" replace />;
  }

  let user;
  try {
    user = JSON.parse(userString);
  } catch (error) {
    // If local storage contains invalid JSON, clear it and redirect to login
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  // If user role is not allowed for this route, redirect to their default home page
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === "ADMIN") {
      return <Navigate to="/admin" replace />;
    } else if (user.role === "STAFF") {
      return <Navigate to="/kitchen" replace />;
    } else {
      return <Navigate to="/home" replace />;
    }
  }

  // Allowed -> render matching child route elements
  return <Outlet />;
}
