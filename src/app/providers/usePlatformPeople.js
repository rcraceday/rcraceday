import { useContext } from "react";
import { PlatformPeopleContext } from "@/app/providers/PlatformPeopleContext";

export function usePlatformPeople() {
  return useContext(PlatformPeopleContext);
}
