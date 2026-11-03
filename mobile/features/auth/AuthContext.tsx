import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, setUnauthorizedHandler } from "../../services/api";
import { clearAccessToken, getAccessToken, loadSessionSnapshot, saveSessionSnapshot } from "../../services/session";
import {
  getCurrentUser,
  loginWithEmail,
  logoutSession,
  registerWithEmail,
  type AuthenticatedUser,
} from "../../services/auth";
import {
  getLearnerSettings,
  getDeviceTimeZone,
  submitPlacementAttempt,
  updateLearnerSettings,
} from "../onboarding/onboarding.service";
import {
  clearOnboardingDraft,
  saveOnboardingDraft,
} from "../onboarding/onboarding.storage";
import type { LearnerSettings, OnboardingDraft } from "../onboarding/onboarding.types";

export type AuthContextValue = {
  user: AuthenticatedUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  offlineSession: boolean;
  sessionNotice: string | null;
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
  const [offlineSession, setOfflineSession] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token || offlineSession) return;
    void saveSessionSnapshot({ user, token, settings }).catch(() => {
      setSessionNotice("This device could not save your offline sign-in. Keep the app open while using downloads.");
    });
  }, [user, token, settings, offlineSession]);

  useEffect(
    () =>
      setUnauthorizedHandler(async (rejectedToken) => {
        const activeToken = await getAccessToken();
        if (activeToken !== rejectedToken) return;

        try {
          await clearAccessToken();
        } finally {
          setUser(null);
          setToken(null);
          setSettings(null);
        }
      }),
    [],
  );

  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const activeToken = await getAccessToken();
      if (!activeToken) {
        setUser(null);
        setToken(null);
        setSettings(null);
        return;
      }

      setToken(activeToken);

      const [currentUser, currentSettings] = await Promise.all([
        getCurrentUser(),
        getLearnerSettings(),
      ]);

      setUser(currentUser);
      setSettings(currentSettings);
      setOfflineSession(false);
      setSessionNotice(null);
    } catch (error) {
      if (error instanceof ApiError && error.code === "UNAUTHORIZED") {
        await clearAccessToken();
        setUser(null);
        setToken(null);
        setSettings(null);
      }
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

        if (isMounted) {
          setToken(activeToken);
        }

        const [currentUser, currentSettings] = await Promise.all([
          getCurrentUser(),
          getLearnerSettings(),
        ]);

        if (isMounted) {
          setUser(currentUser);
          setSettings(currentSettings);
          setOfflineSession(false);
        }
      } catch (error) {
        if (error instanceof ApiError && error.code === "UNAUTHORIZED") {
          await clearAccessToken();
          if (isMounted) {
            setUser(null);
            setToken(null);
            setSettings(null);
          }
        } else if (error instanceof ApiError && (error.status === undefined || error.status >= 500)) {
          try {
            const activeToken = await getAccessToken();
            const snapshot = activeToken ? await loadSessionSnapshot(activeToken) : null;
            if (isMounted && snapshot) {
              setUser(snapshot.user); setSettings(snapshot.settings); setOfflineSession(true);
              setSessionNotice("Offline session: showing this device's last saved profile. Reconnect to sync account data.");
            }
          } catch {
            if (isMounted) setSessionNotice("Offline sign-in could not be restored. Reconnect and sign in again.");
          }
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
      setSettings(null);
      setOfflineSession(false);
      setSessionNotice(null);
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
      setSettings(null);
      setOfflineSession(false);
      setSessionNotice(null);

      if (draft) {
        try {
          await syncOnboardingDraft(draft, true, setSettings);
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
      try {
        await clearAccessToken();
      } finally {
        setUser(null);
        setToken(null);
        setSettings(null);
        setOfflineSession(false);
        setSessionNotice(null);
      }
    }
  }, []);

  const completeOnboarding = useCallback(
    async (draft: OnboardingDraft): Promise<void> => {
      await syncOnboardingDraft(draft, true, setSettings);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user),
      offlineSession,
      sessionNotice,
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
      offlineSession,
      sessionNotice,
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

async function syncOnboardingDraft(
  draft: OnboardingDraft,
  onboardingCompleted: boolean,
  setCurrentSettings: (settings: LearnerSettings) => void,
): Promise<void> {
  let currentDraft = draft;
  if (
    draft.placementAttempt?.attemptId === null &&
    draft.placementAnswers?.length
  ) {
    const attempt = await submitPlacementAttempt(draft.placementAnswers);
    currentDraft = {
      ...draft,
      placementAttempt: attempt,
      placementAnswers: null,
    };
    await saveOnboardingDraft(currentDraft);
  }

  const {
    placementAttempt: _placementAttempt,
    placementAnswers: _placementAnswers,
    ...draftSettings
  } = currentDraft;
  const updatedSettings = await updateLearnerSettings({
    ...draftSettings,
    timezone: currentDraft.timezone || getDeviceTimeZone(),
    onboardingCompleted,
  });
  setCurrentSettings(updatedSettings);
  await clearOnboardingDraft();
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
