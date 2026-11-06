import { createContext } from "react";

export const PlatformPeopleContext = createContext({
  people: [],
  loadingPeople: true,
  rosterAvailable: true,
  refreshPeople: async () => {},
  addPerson: async () => ({ error: null }),
  updatePerson: async () => ({ error: null }),
  removePerson: async () => ({ error: null }),
});
