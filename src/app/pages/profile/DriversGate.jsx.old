// src/app/pages/profile/DriversGate.jsx

import { useDrivers } from "@/app/providers/DriverProvider";
import { Navigate, Outlet, useParams } from "react-router-dom";

export default function DriversGate() {
  const { drivers, loadingDrivers } = useDrivers();
  const { clubSlug } = useParams();

  if (loadingDrivers) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Loading drivers…</p>
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <Navigate
        to={`/${clubSlug}/app/profile/drivers/welcome`}
        replace
      />
    );
  }

  return <Outlet />;
}
