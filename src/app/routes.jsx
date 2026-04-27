import { Routes, Route, Navigate, useParams } from "react-router-dom";

import AppProviders from "@/app/providers/AppProviders";
import ClubLayout from "@/app/providers/ClubLayout";

import AppLayout from "@/layouts/AppLayout";
import PublicLayout from "@/layouts/PublicLayout";
import AdminLayout from "@app/pages/admin/AdminLayout";

import ProtectedAppRoute from "@/app/routes/ProtectedAppRoute";

// GLOBAL
import ClubSelect from "@/app/pages/global/ClubSelect";

// PUBLIC PAGES
import Login from "@app/pages/public/Login";
import Signup from "@app/pages/public/Signup";
import CheckEmail from "@app/pages/public/CheckEmail";
import ForgotPassword from "@app/pages/public/ForgotPassword";
import ResetPassword from "@app/pages/public/ResetPassword";
import ForgotEmail from "@app/pages/public/ForgotEmail";

// APP PAGES
import Home from "@app/pages/home/Home";
import Events from "@app/pages/events/Events";
import EventDetails from "@app/pages/events/EventDetails";
import EventNominate from "@app/pages/events/EventNominate";

// CALENDAR
import Calendar from "@app/pages/events/calendar/Calendar";
import CalendarItemDetails from "@app/pages/events/calendar/CalendarItemDetails";

// PROFILE
import UserProfile from "@app/pages/profile/UserProfile";
import EditUser from "@app/pages/profile/EditUser";
import EditProfile from "@app/pages/profile/EditProfile";
import DriverManager from "@app/pages/profile/DriverManager";
import DriverProfile from "@app/pages/profile/DriverProfile";
import AddDriver from "@app/pages/profile/AddDriver";
import ChooseNumber from "@app/pages/profile/ChooseNumber";
import WelcomeAddDrivers from "@app/pages/profile/WelcomeAddDrivers";

// DRIVER PROVIDER
import DriverProvider from "@/app/providers/DriverProvider";

// ADMIN PAGES
import AdminDashboard from "@app/pages/admin/AdminDashboard";

// EVENTS
import AdminEvents from "@app/pages/admin/events/AdminEvents";
import AdminEventEdit from "@app/pages/admin/events/eventsedit/AdminEventEdit";
import AdminEventNominations from "@app/pages/admin/nominations/AdminEventNominations";
import NominationsExport from "@app/pages/admin/NominationsExport";

// CHAMPIONSHIPS
import ChampionshipsList from "@app/pages/admin/championships/ChampionshipsList";
import CreateChampionship from "@app/pages/admin/championships/CreateChampionship";

// MEMBERSHIP
import Membership from "@app/pages/membership/Membership";
import JoinMembership from "@app/pages/membership/JoinMembership";
import RenewMembership from "@app/pages/membership/RenewMembership";
import UpgradeMembership from "@app/pages/membership/UpgradeMembership";

// STYLE GUIDE
import StyleGuidePage from "@app/pages/style-guide/StyleGuidePage";

// LOGOUT
import Logout from "@app/pages/Logout";

// FALLBACK
import NotFound from "@app/pages/NotFound";

// SETTINGS
import AdminSettingsIndex from "@app/pages/admin/settings/AdminSettingsIndex";
import ClubInfoSettings from "@app/pages/admin/settings/ClubInfoSettings";
import BrandingSettings from "@app/pages/admin/settings/BrandingSettings";
import SystemSettings from "@app/pages/admin/settings/SystemSettings";
import CMSSettings from "@app/pages/admin/settings/CMSSettings";
import UserSettings from "@app/pages/admin/settings/UserSettings";
import MembershipSettings from "@app/pages/admin/settings/MembershipSettings";
import EventDefaultsSettings from "@app/pages/admin/settings/EventDefaultsSettings";
import DriverSettings from "@app/pages/admin/settings/DriverSettings";
import TracksClassesSettings from "@app/pages/admin/settings/TracksClassesSettings";

function ClubRootRedirect() {
  const { clubSlug } = useParams();
  return clubSlug ? <Navigate to={`/${clubSlug}/public/login`} replace /> : null;
}

function PublicRootRedirect() {
  const { clubSlug } = useParams();
  return clubSlug ? <Navigate to={`/${clubSlug}/public/login`} replace /> : null;
}

export default function RoutesFile() {
  return (
    <Routes>
      <Route path="/" element={<ClubSelect />} />

      <Route element={<AppProviders />}>
        {/* PUBLIC */}
        <Route
          path="/:clubSlug/public/*"
          element={
            <ClubLayout>
              <PublicLayout />
            </ClubLayout>
          }
        >
          <Route index element={<PublicRootRedirect />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="check-email/*" element={<CheckEmail />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="forgot-email" element={<ForgotEmail />} />
          <Route path="*" element={<Navigate to="login" replace />} />
        </Route>

        {/* APP (PROTECTED) */}
        <Route
          path="/:clubSlug/app/*"
          element={
            <ClubLayout>
              <ProtectedAppRoute>
                <AppLayout />
              </ProtectedAppRoute>
            </ClubLayout>
          }
        >
          <Route index element={<Home />} />

          {/* MEMBERSHIP */}
          <Route path="membership" element={<Membership />} />
          <Route path="membership/join" element={<JoinMembership />} />
          <Route path="membership/renew" element={<RenewMembership />} />
          <Route path="membership/upgrade" element={<UpgradeMembership />} />

          {/* STYLE GUIDE */}
          <Route path="style-guide" element={<StyleGuidePage />} />

          {/* CALENDAR */}
          <Route path="calendar" element={<Calendar />} />
          <Route path="calendar/:id" element={<CalendarItemDetails />} />

          {/* EVENTS */}
          <Route path="events" element={<Events />} />
          <Route path="events/:id" element={<EventDetails />} />
          <Route path="events/:eventId/nominate" element={<EventNominate />} />

          {/* PROFILE */}
          <Route path="profile" element={<UserProfile />} />
          <Route path="profile/edit" element={<EditUser />} />

          {/* DRIVER MANAGEMENT */}
          <Route
            path="profile/drivers/*"
            element={
              <DriverProvider>
                <DriverManager />
              </DriverProvider>
            }
          />
          <Route
            path="profile/drivers/add"
            element={
              <DriverProvider>
                <AddDriver />
              </DriverProvider>
            }
          />
          <Route
            path="profile/drivers/:id/edit"
            element={
              <DriverProvider>
                <EditProfile />
              </DriverProvider>
            }
          />
          <Route
            path="profile/drivers/:id/choose-number"
            element={
              <DriverProvider>
                <ChooseNumber />
              </DriverProvider>
            }
          />
          <Route
            path="profile/drivers/:id"
            element={
              <DriverProvider>
                <DriverProfile />
              </DriverProvider>
            }
          />
          <Route
            path="profile/drivers/welcome"
            element={
              <DriverProvider>
                <WelcomeAddDrivers />
              </DriverProvider>
            }
          />

          {/* LOGOUT */}
          <Route path="logout" element={<Logout />} />
        </Route>

        {/* ADMIN (PROTECTED) */}
        <Route
          path="/:clubSlug/app/admin/*"
          element={
            <ClubLayout mode="admin">
              <ProtectedAppRoute>
                <AdminLayout />
              </ProtectedAppRoute>
            </ClubLayout>
          }
        >
          <Route index element={<AdminDashboard />} />

          {/* SETTINGS */}
          <Route path="settings" element={<AdminSettingsIndex />} />
          <Route path="settings/club-info" element={<ClubInfoSettings />} />
          <Route path="settings/branding" element={<BrandingSettings />} />
          <Route path="settings/system" element={<SystemSettings />} />
          <Route path="settings/cms" element={<CMSSettings />} />
          <Route path="settings/users" element={<UserSettings />} />
          <Route path="settings/membership" element={<MembershipSettings />} />
          <Route path="settings/event-defaults" element={<EventDefaultsSettings />} />
          <Route path="settings/driver" element={<DriverSettings />} />
          <Route path="settings/tracks-classes" element={<TracksClassesSettings />} />

          {/* EVENTS */}
          <Route path="events" element={<AdminEvents />} />
          <Route path="events/new" element={<AdminEventEdit />} />
          <Route path="events/:id" element={<AdminEventEdit />} />
          <Route path="events/:id/nominations" element={<AdminEventNominations />} />
          <Route path="events/:id/nominations/export" element={<NominationsExport />} />

          {/* CHAMPIONSHIPS */}
          <Route path="championships" element={<ChampionshipsList />} />
          <Route path="championships/create" element={<CreateChampionship />} />
        </Route>

        {/* CLUB ROOT REDIRECT */}
        <Route path="/:clubSlug" element={<ClubRootRedirect />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
