// src/app/routes.jsx
import { Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";

import PlatformHome from "@/app/pages/global/PlatformHome.jsx";
import ClubFinder from "@/app/pages/global/ClubFinder.jsx";
import LaunchRedirect from "@/app/pages/global/LaunchRedirect.jsx";

import AppLayout from "@/layouts/AppLayout";
import PublicLayout from "@/layouts/PublicLayout";
import AdminLayout from "@/layouts/AdminLayout";

import ProtectedAppRoute from "@/app/routes/ProtectedAppRoute";
import ClubProvider from "@/app/providers/ClubProvider";
import ThemeProvider from "@/app/providers/ThemeProvider";

// PUBLIC PAGES
import ClubPublicLoginEntry from "@app/pages/public/ClubPublicLoginEntry";
import RedirectClubSignup from "@app/pages/public/RedirectClubSignup";
import CheckEmail from "@app/pages/public/CheckEmail";
import ForgotPassword from "@app/pages/public/ForgotPassword";
import ResetPassword from "@app/pages/public/ResetPassword";
import ForgotEmail from "@app/pages/public/ForgotEmail";
import ClaimMembership from "@app/pages/public/ClaimMembership";

// USER PAGES
import Home from "@app/pages/home/Home";
import ClubNews from "@app/pages/home/ClubNews";
import NewsDetails from "@app/pages/home/NewsDetails";
import Events from "@app/pages/events/Events";
import EventDetails from "@app/pages/events/EventDetails";
import EventResults from "@app/pages/events/EventResults";
import ResultsIndex from "@app/pages/events/ResultsIndex";
import ChampionshipsIndex from "@app/pages/events/ChampionshipsIndex";
import ChampionshipStandings from "@app/pages/events/ChampionshipStandings";
import EventNominate from "@app/pages/events/EventNominate";
import NominationsView from "@app/pages/nominations/NominationsView";
import NominationsReview from "@app/pages/nominations/NominationsReview";
import ClubMessages from "@app/pages/messages/ClubMessages";
import UserSettingsIndex from "@app/pages/settings/UserSettingsIndex";
import AccountSettings from "@app/pages/settings/AccountSettings";
import UserNotificationSettings from "@app/pages/settings/UserNotificationSettings";
import LanguageSettings from "@app/pages/settings/LanguageSettings";
import TimezoneSettings from "@app/pages/settings/TimezoneSettings";

// CALENDAR
import Calendar from "@app/pages/events/calendar/Calendar";
import CalendarItemDetails from "@app/pages/events/calendar/CalendarItemDetails";

// PROFILE
import EditProfile from "@app/pages/profile/EditProfile";
import DriverManager from "@app/pages/profile/DriverManager";
import DriverProfile from "@app/pages/profile/DriverProfile";
import AddDriver from "@app/pages/profile/AddDriver";
import ChooseNumber from "@app/pages/profile/ChooseNumber";
import WelcomeAddDrivers from "@app/pages/profile/WelcomeAddDrivers";
import ClubAccessClassMap from "@app/pages/profile/ClubAccessClassMap";

import DriverProvider from "@/app/providers/DriverProvider";
import DriverProfilesAccessGate from "@/app/components/driver/DriverProfilesAccessGate";

// ADMIN PAGES
import AdminDashboard from "@app/pages/admin/AdminDashboard";
import AdminMetrics from "@app/pages/admin/AdminMetrics";
import AdminMetricsArchives from "@app/pages/admin/AdminMetricsArchives";
import AdminEvents from "@app/pages/admin/events/AdminEvents";
import AdminEventEdit from "@app/pages/admin/events/eventsedit/AdminEventEdit";
import AdminNominations from "@app/pages/admin/AdminNominations";
import AdminNominationsEvent from "@app/pages/admin/AdminNominationsEvent";
import AdminClubMessages from "@app/pages/admin/messages/AdminClubMessages";
import AdminClubNews from "@app/pages/admin/news/AdminClubNews";
import AdminClubNewsEdit from "@app/pages/admin/news/AdminClubNewsEdit";
import NominationsExport from "@app/pages/admin/NominationsExport";

// CHAMPIONSHIPS
import ChampionshipsList from "@app/pages/admin/championships/ChampionshipsList";
import CreateChampionship from "@app/pages/admin/championships/CreateChampionship";
import AdminChampionshipManage from "@app/pages/admin/championships/AdminChampionshipManage";
import AdminEventResults from "@app/pages/admin/events/AdminEventResults";

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
import UserSettings from "@app/pages/admin/settings/UserSettings";
import MembershipSettings from "@app/pages/admin/settings/MembershipSettings";
import EventDefaultsSettings from "@app/pages/admin/settings/EventDefaultsSettings";
import DriverSettings from "@app/pages/admin/settings/DriverSettings";
import TracksClassesSettings from "@app/pages/admin/settings/TracksClassesSettings";
import AdminMemberships from "@app/pages/admin/AdminMemberships";
import AdminMembershipEdit from "@app/pages/admin/AdminMembershipEdit";
import AdminDrivers from "@app/pages/admin/AdminDrivers";
import AdminDriverEdit from "@app/pages/admin/AdminDriverEdit";

const RESERVED_TOP_LEVEL_SLUGS = new Set([
  "find-club",
  "launch",
  "forgot-password",
  "forgot-email",
  "reset-password",
  "recover-password",
]);

function ClubRootRedirect() {
  const { clubSlug } = useParams();
  if (!clubSlug) return null;

  const normalized = clubSlug.toLowerCase();
  if (normalized === "reset-password" || normalized === "recover-password") {
    return (
      <PlatformAuthLayout>
        <ResetPassword />
      </PlatformAuthLayout>
    );
  }
  if (normalized === "forgot-password") {
    return (
      <PlatformAuthLayout>
        <ForgotPassword />
      </PlatformAuthLayout>
    );
  }
  if (normalized === "forgot-email") {
    return (
      <PlatformAuthLayout>
        <ForgotEmail />
      </PlatformAuthLayout>
    );
  }
  if (RESERVED_TOP_LEVEL_SLUGS.has(normalized)) {
    return <NotFound />;
  }

  return (
    <Navigate to={`/${clubSlug}/public/claim-membership`} replace />
  );
}

function ResetPasswordTrailingSlashRedirect() {
  const { clubSlug } = useParams();
  const location = useLocation();
  return (
    <Navigate
      to={`/${clubSlug}/public/reset-password${location.search}${location.hash}`}
      replace
    />
  );
}

function PlatformResetPasswordRedirect() {
  const location = useLocation();
  return (
    <Navigate
      to={`/recover-password${location.search}${location.hash}`}
      replace
    />
  );
}

function PlatformResetPasswordTrailingSlashRedirect() {
  const location = useLocation();
  return (
    <Navigate
      to={`/recover-password${location.search}${location.hash}`}
      replace
    />
  );
}

function PlatformAuthLayout({ children }) {
  return (
    <ThemeProvider>
      <main
        style={{
          width: "100%",
          minHeight: "100vh",
          background: "white",
          display: "flex",
          justifyContent: "center",
          padding: "20px 20px 24px",
          boxSizing: "border-box",
        }}
      >
        {children}
      </main>
    </ThemeProvider>
  );
}

function AppPathRedirect({ to }) {
  const { clubSlug } = useParams();
  return clubSlug ? <Navigate to={`/${clubSlug}/app/${to}`} replace /> : null;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* ROOT */}
      <Route
        path="/"
        element={
          <ThemeProvider>
            <PlatformHome />
          </ThemeProvider>
        }
      />
      <Route
        path="/find-club"
        element={
          <ThemeProvider>
            <ClubFinder />
          </ThemeProvider>
        }
      />
      <Route path="/launch" element={<LaunchRedirect />} />
      <Route
        path="/forgot-password"
        element={
          <PlatformAuthLayout>
            <ForgotPassword />
          </PlatformAuthLayout>
        }
      />
      <Route
        path="/forgot-email"
        element={
          <PlatformAuthLayout>
            <ForgotEmail />
          </PlatformAuthLayout>
        }
      />
      <Route
        path="/recover-password"
        element={
          <PlatformAuthLayout>
            <ResetPassword />
          </PlatformAuthLayout>
        }
      />
      <Route path="/reset-password" element={<PlatformResetPasswordRedirect />} />
      <Route
        path="/reset-password/*"
        element={<PlatformResetPasswordRedirect />}
      />
      <Route
        path="/reset-password/"
        element={<PlatformResetPasswordTrailingSlashRedirect />}
      />

      {/* PUBLIC ROUTES */}
      <Route
        path="/:clubSlug/public/*"
        element={
          <ClubProvider>
            <ThemeProvider>
              <PublicLayout />
            </ThemeProvider>
          </ClubProvider>
        }
      >
        <Route index element={<ClubRootRedirect />} />
        <Route path="login" element={<ClubPublicLoginEntry />} />
        <Route path="signup" element={<RedirectClubSignup />} />
        <Route path="claim-membership" element={<ClaimMembership />} />
        <Route path="access" element={<ClaimMembership />} />
        <Route path="check-email/*" element={<CheckEmail />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password/*" element={<ResetPassword />} />
        <Route
          path="reset-password/"
          element={<ResetPasswordTrailingSlashRedirect />}
        />
        <Route path="forgot-email" element={<ForgotEmail />} />
        <Route path="*" element={<Navigate to="login" replace />} />
      </Route>

      {/* USER APP ROUTES */}
      <Route
        path="/:clubSlug/app/*"
        element={
          <ThemeProvider>
            <ProtectedAppRoute>
              <AppLayout />
            </ProtectedAppRoute>
          </ThemeProvider>
        }
      >
        <Route index element={<Home />} />
        <Route path="news" element={<ClubNews />} />
        <Route path="news/:id" element={<NewsDetails />} />
        <Route path="membership" element={<Membership />} />
        <Route path="membership/join" element={<JoinMembership />} />
        <Route path="membership/renew" element={<RenewMembership />} />
        <Route path="membership/upgrade" element={<UpgradeMembership />} />
        <Route path="style-guide" element={<StyleGuidePage />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="calendar/:id" element={<CalendarItemDetails />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:id" element={<EventDetails />} />
        <Route path="events/:id/results" element={<EventResults />} />
        <Route path="events/:eventId/nominate" element={<EventNominate />} />
        <Route path="results" element={<ResultsIndex />} />
        <Route path="championships" element={<ChampionshipsIndex />} />
        <Route path="championships/:id" element={<ChampionshipStandings />} />
        <Route path="events/:eventId/nominations" element={<NominationsView />} />
        <Route path="nominations" element={<NominationsReview />} />
        <Route path="messages" element={<ClubMessages />} />
        <Route path="settings" element={<UserSettingsIndex />} />
        <Route path="settings/account" element={<AccountSettings />} />
        <Route path="settings/notifications" element={<UserNotificationSettings />} />
        <Route path="settings/language" element={<LanguageSettings />} />
        <Route path="settings/timezone" element={<TimezoneSettings />} />
        <Route path="profile" element={<AppPathRedirect to="settings" />} />
        <Route path="profile/edit" element={<AppPathRedirect to="settings/account" />} />

        <Route
          path="profile/drivers/welcome"
          element={
            <DriverProvider>
              <DriverProfilesAccessGate>
                <WelcomeAddDrivers />
              </DriverProfilesAccessGate>
            </DriverProvider>
          }
        />
        <Route
          path="profile/drivers/setup"
          element={
            <DriverProvider>
              <DriverProfilesAccessGate>
                <ClubAccessClassMap />
              </DriverProfilesAccessGate>
            </DriverProvider>
          }
        />
        <Route
          path="profile/drivers/*"
          element={
            <DriverProvider>
              <DriverProfilesAccessGate>
                <DriverManager />
              </DriverProfilesAccessGate>
            </DriverProvider>
          }
        />

        <Route
          path="profile/drivers/add"
          element={
            <DriverProvider>
              <DriverProfilesAccessGate>
                <AddDriver />
              </DriverProfilesAccessGate>
            </DriverProvider>
          }
        />

        <Route
          path="profile/drivers/:id/edit"
          element={
            <DriverProvider>
              <DriverProfilesAccessGate>
                <EditProfile />
              </DriverProfilesAccessGate>
            </DriverProvider>
          }
        />

        <Route
          path="profile/drivers/:id/choose-number"
          element={
            <DriverProvider>
              <DriverProfilesAccessGate>
                <ChooseNumber />
              </DriverProfilesAccessGate>
            </DriverProvider>
          }
        />

        <Route
          path="profile/drivers/:id"
          element={
            <DriverProvider>
              <DriverProfilesAccessGate>
                <DriverProfile />
              </DriverProfilesAccessGate>
            </DriverProvider>
          }
        />

        <Route path="logout" element={<Logout />} />
      </Route>

      {/* ADMIN ROUTES */}
      <Route
        path="/:clubSlug/app/admin/*"
        element={
          <ThemeProvider mode="admin">
            <ProtectedAppRoute admin>
              <AdminLayout />
            </ProtectedAppRoute>
          </ThemeProvider>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="metrics" element={<AdminMetrics />} />
        <Route path="messages" element={<AdminClubMessages />} />
        <Route path="news" element={<AdminClubNews />} />
        <Route path="news/new" element={<AdminClubNewsEdit />} />
        <Route path="news/:id" element={<AdminClubNewsEdit />} />
        <Route path="membership" element={<AdminMemberships />} />
        <Route path="membership/new" element={<AdminMembershipEdit />} />
        <Route path="membership/:id" element={<AdminMembershipEdit />} />
        <Route path="drivers" element={<AdminDrivers />} />
        <Route path="drivers/new" element={<AdminDriverEdit />} />
        <Route path="drivers/:id" element={<AdminDriverEdit />} />
        <Route path="nominations" element={<AdminNominations />} />
        <Route path="nominations/:eventId" element={<AdminNominationsEvent />} />
        <Route path="archives" element={<AdminMetricsArchives />} />
        <Route path="settings" element={<AdminSettingsIndex />} />
        <Route path="settings/club-info" element={<ClubInfoSettings />} />
        <Route path="settings/branding" element={<BrandingSettings />} />
        <Route path="settings/system" element={<SystemSettings />} />
        <Route path="settings/users" element={<UserSettings />} />
        <Route path="settings/membership" element={<MembershipSettings />} />
        <Route path="settings/event-defaults" element={<EventDefaultsSettings />} />
        <Route path="settings/driver" element={<DriverSettings />} />
        <Route path="settings/tracks-and-classes" element={<TracksClassesSettings />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="events/new" element={<AdminEventEdit />} />
        <Route path="events/:id" element={<AdminEventEdit />} />
        <Route
          path="events/:id/results/preview"
          element={<EventResults previewUnpublished adminBack />}
        />
        <Route path="events/:id/results" element={<AdminEventResults />} />
        <Route path="events/:id/nominations" element={<AdminNominationsEvent />} />
        <Route path="events/:id/nominations/export" element={<NominationsExport />} />
        <Route path="championships" element={<ChampionshipsList />} />
        <Route path="championships/create" element={<CreateChampionship />} />
        <Route path="championships/:id" element={<AdminChampionshipManage />} />
      </Route>

      {/* FALLBACKS */}
      <Route path="/:clubSlug" element={<ClubRootRedirect />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
