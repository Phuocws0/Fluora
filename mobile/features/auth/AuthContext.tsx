import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearAccessToken, getAccessToken } from "../../services/session";
import {
  getCurrentUser,
  loginWithEmail,
  logoutSession,
  registerWithEmail,
  type AuthenticatedUser,
} from "../../services/auth";
import {
  getLearnerSettings,
  updateLearnerSettings,
} from "../onboarding/onboarding.service";
import { clearOnboardingDraft } from "../onboarding/onboarding.storage";
import type { LearnerSettings, OnboardingDraft } from "../onboarding/onboarding.types";

export type AuthContextValue = {
  user: AuthenticatedUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  settings: LearnerSettings | null;
  login: (email: string, password: string) => Promise<AuthenticatedUser>;
  register: (
    displayName: string,
    email: string,
    password: string,
    draft?: OnboardingDraft,
  ) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  completeOnboarding: (draft: OnboardingDraft) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [settings, setSettings] = useState<LearnerSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const activeToken = await getAccessToken();
      if (!activeToken) {
        setUser(null);
        setToken(null);
        setSettings(null);
        return;
      }

      const [currentUser, currentSettings] = await Promise.all([
        getCurrentUser(),
        getLearnerSettings(),
      ]);

      setUser(currentUser);
      setToken(activeToken);
      setSettings(currentSettings);
    } catch {
      await clearAccessToken();
      setUser(null);
      setToken(null);
      setSettings(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initializeSession() {
      try {
        const activeToken = await getAccessToken();
        if (!activeToken) {
          if (isMounted) {
            setUser(null);
            setToken(null);
            setSettings(null);
          }
          return;
        }

        const [currentUser, currentSettings] = await Promise.all([
          getCurrentUser(),
          getLearnerSettings(),
        ]);

        if (isMounted) {
          setUser(currentUser);
          setToken(activeToken);
          setSettings(currentSettings);
        }
      } catch {
        await clearAccessToken();
        if (isMounted) {
          setUser(null);
          setToken(null);
          setSettings(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthenticatedUser> => {
      const auth = await loginWithEmail({ email, password });
      setUser(auth.user);
      setToken(auth.token);
      try {
        const currentSettings = await getLearnerSettings();
        setSettings(currentSettings);
      } catch {
        // Keep login valid even if fetching settings encounters an issue
      }
      return auth.user;
    },
    [],
  );

  const register = useCallback(
    async (
      displayName: string,
      email: string,
      password: string,
      draft?: OnboardingDraft,
    ): Promise<AuthenticatedUser> => {
      const auth = await registerWithEmail({ displayName, email, password });
      setUser(auth.user);
      setToken(auth.token);

      if (draft) {
        try {
          const { placementAttempt: _discarded, ...draftSettings } = draft;
          const updatedSettings = await updateLearnerSettings({
            ...draftSettings,
            onboardingCompleted: true,
          });
          setSettings(updatedSettings);
          await clearOnboardingDraft();
        } catch {
          try {
            const defaultSettings = await getLearnerSettings();
            setSettings(defaultSettings);
          } catch {
            // Keep registration valid even if settings update fails
          }
        }
      } else {
        try {
          const currentSettings = await getLearnerSettings();
          setSettings(currentSettings);
        } catch {
          // ignore
        }
      }

      return auth.user;
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutSession();
    } finally {
      await clearAccessToken();
      setUser(null);
      setToken(null);
      setSettings(null);
    }
  }, []);

  const completeOnboarding = useCallback(
    async (draft: OnboardingDraft): Promise<void> => {
      const { placementAttempt: _discarded, ...draftSettings } = draft;
      const updatedSettings = await updateLearnerSettings({
        ...draftSettings,
        onboardingCompleted: true,
      });
      setSettings(updatedSettings);
      await clearOnboardingDraft();
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user),
      settings,
      login,
      register,
      logout,
      refreshSession,
      completeOnboarding,
    }),
    [
      user,
      token,
      isLoading,
      settings,
      login,
      register,
      logout,
      refreshSession,
      completeOnboarding,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
