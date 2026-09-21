// src/app/providers/AppProviders.jsx

import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";

import ClubProvider from "@/app/providers/ClubProvider";
import ThemeProvider from "@/app/providers/ThemeProvider";
import ProfileProvider from "@/app/providers/ProfileProvider";
import MembershipProvider from "@/app/providers/MembershipProvider";
import DriverProvider from "@/app/providers/DriverProvider";
import NumberProvider from "@/app/providers/NumberProvider";
import NotificationProvider from "@/app/providers/NotificationProvider";

function AuthenticatedProviders({ children }) {
  return (
    <ClubProvider>
      <ThemeProvider>
        <ProfileProvider>
          <MembershipProvider>
            <DriverProvider>
              <NumberProvider>
                <NotificationProvider>
                  {children}
                </NotificationProvider>
              </NumberProvider>
            </DriverProvider>
          </MembershipProvider>
        </ProfileProvider>
      </ThemeProvider>
    </ClubProvider>
  );
}

export default function AppProviders() {
  const { user, loadingUser } = useAuth();
  const { pathname } = useLocation();

  const isPublicRoute =
    pathname === "/" || pathname.includes("/public/");

  // ⭐ 1. Still loading session → show splash
  if (loadingUser) {
    return (
      <div style={{ padding: 40, fontSize: 24 }}>
        Checking session…
      </div>
    );
  }

  // ⭐ 2. User NOT logged in → render login OUTSIDE providers
  if (!user || isPublicRoute) {
    return <Outlet />;
  }

  // ⭐ 3. User logged in → wrap authenticated routes in providers
  return (
    <AuthenticatedProviders>
      <Outlet />
    </AuthenticatedProviders>
  );
}
