import React from "react";

export default function TeamChassisTrackSection({ driver }) {
  return (
    <div className="col-span-6 space-y-4 flex flex-col items-center text-center">

      {driver.team_name && (
        <p className="text-lrg text-gray-800">
          <span className="font-semibold">Team:</span> {driver.team_name}
        </p>
      )}

      {driver.home_track && (
        <p className="text-lrg text-gray-800">
          <span className="font-semibold">Home Track:</span>{" "}
          {driver.home_track}
        </p>
      )}
    </div>
  );
}
