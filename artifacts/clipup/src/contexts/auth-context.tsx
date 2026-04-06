import React, { createContext, useContext, useState } from "react";

type AuthContextType = {
  userId: number | null;
  setUserId: (id: number | null) => void;
};

const AuthContext = createContext<AuthContextType>({
  userId: null,
  setUserId: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserIdState] = useState<number | null>(() => {
    // Check if this is a Google OAuth redirect (/?googleUserId=X)
    const urlParams = new URLSearchParams(window.location.search);
    const googleUserId = urlParams.get("googleUserId");
    if (googleUserId) {
      const id = parseInt(googleUserId, 10);
      if (!isNaN(id)) {
        localStorage.setItem("currentUserId", id.toString());
        // Clean up URL without triggering a navigation
        const clean = new URL(window.location.href);
        clean.searchParams.delete("googleUserId");
        window.history.replaceState({}, "", clean.toString());
        return id;
      }
    }
    const stored = localStorage.getItem("currentUserId");
    return stored ? parseInt(stored, 10) : null;
  });

  const setUserId = (id: number | null) => {
    setUserIdState(id);
  };

  return (
    <AuthContext.Provider value={{ userId, setUserId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
