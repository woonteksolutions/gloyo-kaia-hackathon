import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAccessToken, setAccessToken, clearAccessToken, isTokenExpired, getTokenRemainingTime, getStoredUserData } from '@/auth/token';
import { useToast } from '@/hooks/use-toast';
import { OnboardingFlowService } from '@/services/onboardingFlowService';
import { GnosisPayUser, OnboardingStep } from '@/types/gnosis-api';

interface GnosisPayContextType {
  user: GnosisPayUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentStep: OnboardingStep;
  error?: string;
  tokenRemainingMinutes: number;
  isTokenExpired: boolean;
  navigateToStep: (step: OnboardingStep) => void;
  updateUser: (updates: Partial<GnosisPayUser>) => void;
  setAccessToken: (token: string, userData?: any) => void;
  refreshUserData: () => Promise<void>;
  logout: () => void;
  requireReauthentication: () => void;
}

const GnosisPayContext = createContext<GnosisPayContextType | undefined>(undefined);

export function useGnosisPay() {
  const context = useContext(GnosisPayContext);
  console.log('🚀 useGnosisPay called, context exists:', !!context);
  if (!context) {
    console.error('🚀 useGnosisPay: No context found! Component not wrapped by GnosisPayProvider');
    throw new Error('useGnosisPay must be used within a GnosisPayProvider');
  }
  return context;
}

interface GnosisPayProviderProps {
  children: ReactNode;
}

export function GnosisPayProvider({ children }: GnosisPayProviderProps) {
  console.log('🚀 GnosisPayProvider: Provider component rendering');
  const [accessTokenState, setAccessTokenState] = useState<string | null>(() => {
    // Synchronous hydration from localStorage to avoid pre-auth flash on refresh
    return getAccessToken();
  });
  const [user, setUser] = useState<GnosisPayUser | null>(() => {
    return getStoredUserData();
  });
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(() => {
    const storedUser = getStoredUserData();
    return storedUser ? (OnboardingFlowService.determineCurrentStep(storedUser) as OnboardingStep) : 'auth';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [tokenRemainingMinutes, setTokenRemainingMinutes] = useState(() => getTokenRemainingTime());
  const { toast } = useToast();

  console.log('🔍 GnosisPayProvider: Initializing with accessToken:', !!accessTokenState);

  // Initial validation after hydration to set remaining time and handle immediate expiry
  useEffect(() => {
    if (accessTokenState) {
      const remainingTime = getTokenRemainingTime();
      setTokenRemainingMinutes(remainingTime);
      console.log('🔑 JWT token remaining time (init):', remainingTime, 'minutes');
      if (remainingTime <= 0) {
        console.log('🔑 JWT token expired during initialization, clearing state');
        logout();
      }
    }
    // We intentionally run this only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up token expiry monitoring
  useEffect(() => {
    if (!accessTokenState) return;

    const checkTokenExpiry = () => {
      const remaining = getTokenRemainingTime();
      setTokenRemainingMinutes(remaining);
      
      if (remaining <= 0 && !isTokenExpired()) {
        console.log('🔑 JWT token has expired, requiring re-authentication');
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please sign in again.',
          variant: 'destructive',
        });
        logout();
      } else if (remaining <= 5 && remaining > 0) {
        // Warn user when token is about to expire
        toast({
          title: 'Session Expiring Soon',
          description: `Your session will expire in ${remaining} minutes.`,
        });
      }
    };

    // Check immediately
    checkTokenExpiry();

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60000);
    
    return () => clearInterval(interval);
  }, [accessTokenState, toast]);

  const isAuthenticated = !!accessTokenState && !!user && !isTokenExpired();

  const requireReauthentication = () => {
    console.log('🔑 Re-authentication required due to expired JWT');
    toast({
      title: 'Authentication Required',
      description: 'Your session has expired. Please sign in again to continue.',
      variant: 'destructive',
    });
    logout();
  };

  const updateUser = (updates: Partial<GnosisPayUser>) => {
    setUser(current => current ? { ...current, ...updates } : null);
  };

  const handleSetAccessToken = (newToken: string, userData?: any) => {
    setAccessToken(newToken, userData);
    setAccessTokenState(newToken);
    
    // Set user data if provided
    if (userData) {
      setUser(userData);
      console.log('🔍 GnosisPayProvider: Set token with user data');
    }
  };

  const logout = () => {
    clearAccessToken();
    setAccessTokenState(null);
    setUser(null);
    setCurrentStep('auth');
    setError(undefined);
  };

  const refreshUserData = async () => {
    if (!accessTokenState) return;
    
    // Check token expiry before making API calls
    if (isTokenExpired()) {
      console.log('🔑 Token expired during refresh, requiring re-authentication');
      logout();
      return;
    }
    
    setIsLoading(true);
    setError(undefined);
    
    try {
      const result = await OnboardingFlowService.checkUserProgress();
      
      if (result.error) {
        setError(result.error);
        if (result.error.includes('Authentication') || result.error.includes('jwt malformed') || result.error.includes('401')) {
          console.log('🔑 Authentication error during refresh, clearing token');
          logout();
          return;
        }
      }
      
      setUser(result.user);
      setCurrentStep(result.currentStep);
      
      // Update stored user data to maintain persistence
      if (result.user && accessTokenState) {
        setAccessToken(accessTokenState, result.user);
      }
      
    } catch (error: any) {
      console.error('Error refreshing user data:', error);
      
      // Handle JWT expiry or authentication errors
      if (error.message?.includes('jwt malformed') || error.message?.includes('401') || error.message?.includes('Authentication')) {
        console.log('🔑 Authentication error during refresh, requiring re-authentication');
        logout();
        return;
      }
      
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe navigation using the onboarding flow service
  const navigateToStep = (targetStep: OnboardingStep) => {
    console.log('🔍 GnosisPayProvider: navigateToStep called:', { targetStep, currentUser: !!user });
    
    if (!user) {
      console.log('🔍 GnosisPayProvider: No user, setting to auth step');
      setCurrentStep('auth');
      return;
    }

    // Check if navigation is allowed
    if (!OnboardingFlowService.canNavigateToStep(user, targetStep)) {
      console.log('🔍 GnosisPayProvider: Navigation not allowed', { user, targetStep });
      toast({
        title: 'Navigation Not Allowed',
        description: 'You cannot navigate to this step yet. Please complete the current step first.',
        variant: 'destructive',
      });
      return;
    }

    console.log('🔍 GnosisPayProvider: Navigation allowed, setting step to:', targetStep);
    setCurrentStep(targetStep);
  };

  // Auto-load user progress when we have an access token but no user data
  // Only if we didn't restore user data from storage
  useEffect(() => {
    if (accessTokenState && !user && !isLoading && !getStoredUserData()) {
      console.log('🔍 GnosisPayProvider: No user data found, fetching from API');
      refreshUserData();
    }
  }, [accessTokenState, user, isLoading]);

  // Reset to auth step when no access token
  useEffect(() => {
    if (!accessTokenState) {
      setCurrentStep('auth');
      setError(undefined);
    }
  }, [accessTokenState]);

  // This complex logic is now handled by OnboardingFlowService

  return (
    <GnosisPayContext.Provider
      value={{
        user,
        accessToken: accessTokenState,
        isAuthenticated,
        isLoading,
        currentStep,
        error,
        tokenRemainingMinutes,
        isTokenExpired: isTokenExpired(),
        navigateToStep,
        updateUser,
        setAccessToken: handleSetAccessToken,
        refreshUserData,
        logout,
        requireReauthentication,
      }}
    >
      {children}
    </GnosisPayContext.Provider>
  );
}