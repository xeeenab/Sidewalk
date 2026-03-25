'use client';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

type SessionState = {
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  setSession: (params: { accessToken: string; refreshToken?: string | null }) => Promise<void>;
  clearSession: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

const ACCESS_TOKEN_KEY = 'sidewalk:mobile:access-token';
const REFRESH_TOKEN_KEY = 'sidewalk:mobile:refresh-token';

export function SessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      const [storedAccessToken, storedRefreshToken] = await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
      ]);

      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setIsHydrated(true);
    };

    void hydrate();
  }, []);

  const value = useMemo(
    () => ({
      accessToken,
      refreshToken,
      isHydrated,
      setSession: async ({
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
      }: {
        accessToken: string;
        refreshToken?: string | null;
      }) => {
        setAccessToken(nextAccessToken);
        if (nextRefreshToken !== undefined) {
          setRefreshToken(nextRefreshToken);
        }

        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, nextAccessToken);
        if (nextRefreshToken) {
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
        }
      },
      clearSession: async () => {
        setAccessToken(null);
        setRefreshToken(null);
        await Promise.all([
          AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
          AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
        ]);
      },
    }),
    [accessToken, isHydrated, refreshToken],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }

  return context;
};
