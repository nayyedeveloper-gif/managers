import { useAuth } from "@/hooks/use-auth";

export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return user?.role === "admin";
}
