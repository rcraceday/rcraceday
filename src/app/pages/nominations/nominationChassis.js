import { chassisFromNominationSnapshot } from "@/app/lib/livetimeDriverProfileFields";

export function chassisForDriverClass(nomination, driverId, classId, driverClassChassisMap) {
  const fromSnapshot = chassisFromNominationSnapshot(nomination, classId);
  if (fromSnapshot) return fromSnapshot;
  if (!driverId || !classId || !driverClassChassisMap) return "";
  return String(driverClassChassisMap.get(`${driverId}:${classId}`) || "").trim();
}