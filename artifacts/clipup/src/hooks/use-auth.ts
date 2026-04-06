import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLoginUser, useLogoutUser, useGetUser, getGetUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function useAuth() {
  const [userId, setUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem("currentUserId");
    return stored ? parseInt(stored, 10) : null;
  });
  
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useGetUser(userId || 0, {
    query: {
      enabled: !!userId,
      queryKey: getGetUserQueryKey(userId || 0),
    }
  });

  const loginMutation = useLoginUser();
  const logoutMutation = useLogoutUser();

  const login = async (data: Parameters<typeof loginMutation.mutateAsync>[0]) => {
    try {
      const result = await loginMutation.mutateAsync(data);
      if (result && result.id) {
        setUserId(result.id);
        localStorage.setItem("currentUserId", result.id.toString());
        setLocation("/");
      }
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setUserId(null);
      localStorage.removeItem("currentUserId");
      queryClient.clear();
      setLocation("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
  };
}
