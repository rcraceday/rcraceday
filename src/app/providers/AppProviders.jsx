// src/app/providers/AppProviders.jsx
import { Outlet } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import ClubProvider from "@/app/providers/ClubProvider";

import ProfileProvider from "@/app/providers/ProfileProvider";
import MembershipProvider from "@/app/providers/MembershipProvider";
import DriverProvider from "@/app/providers/DriverProvider";
import NumberProvider from "@/app/providers/NumberProvider";
import NotificationProvider from "@/app/providers/NotificationProvider";

function InnerAppProviders() {
  const { user } = useAuth();

  console.log("[InnerAppProviders]", { user });

  return (
    <ProfileProvider>
      <MembershipProvider>
        <DriverProvider>
          <NumberProvider>
            <NotificationProvider>
              <Outlet />
            </NotificationProvider>
          </NumberProvider>
        </DriverProvider>
      </MembershipProvider>
    </ProfileProvider>
  );
}

export default function AppProviders() {
  return (
    <ClubProvider>
      <InnerAppProviders />
    </ClubProvider>
  );
}
