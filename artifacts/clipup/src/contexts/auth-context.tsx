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
