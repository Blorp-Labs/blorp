import { useContext, createContext } from "react";

export const AuthContext = createContext<{
  authenticate: (config?: { addAccount?: boolean }) => Promise<void>;
}>({
  authenticate: () => Promise.reject(),
});

export function useRequireAuth() {
  return useContext(AuthContext).authenticate;
}
