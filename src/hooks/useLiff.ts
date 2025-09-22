import { useState, useEffect } from 'react';
import liff from '@line/liff';

interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LiffContext {
  type: string;
  viewType: string;
  userId: string;
  utouId: string;
  roomId?: string;
  groupId?: string;
  [key: string]: any; // Allow additional properties
}

interface LiffDecodedIDToken {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  auth_time: number;
  nonce: string;
  amr: string[];
  name: string;
  picture: string;
  email?: string;
}

export function useLiff() {
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [context, setContext] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        console.log('🔍 LIFF - Starting initialization...');
        console.log('🔍 LIFF - @line/liff module loaded:', typeof liff);
        console.log('🔍 LIFF - LIFF object available:', !!liff);
        
        const liffId = import.meta.env.VITE_LIFF_ID;
        console.log('🔍 LIFF - LIFF ID from env:', liffId);
        
        if (!liffId || liffId === 'your-liff-id-here') {
          const errorMsg = 'LIFF ID not configured. Please set VITE_LIFF_ID in your environment variables.';
          console.error('🔍 LIFF - Configuration error:', errorMsg);
          setError(errorMsg);
          return;
        }

        // Check if we're in a compatible environment
        const userAgent = navigator.userAgent;
        console.log('🔍 LIFF - User Agent:', userAgent);
        console.log('🔍 LIFF - Is LINE browser:', userAgent.includes('Line/'));
        console.log('🔍 LIFF - Is mobile:', /Mobi|Android/i.test(userAgent));
        
        // For development/testing, allow initialization in any environment
        const isDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname.includes('gloyo.app') ||
                            window.location.hostname.includes('vercel.app');
        
        console.log('🔍 LIFF - Is development environment:', isDevelopment);

        console.log('🔍 LIFF - Initializing with ID:', liffId);
        console.log('🔍 LIFF - Init options:', {
          liffId,
          withLoginOnExternalBrowser: true
        });
        
        await liff.init({
          liffId,
          withLoginOnExternalBrowser: true
        });

        console.log('🔍 LIFF - Initialization successful');
        console.log('🔍 LIFF - isLoggedIn:', liff.isLoggedIn());
        console.log('🔍 LIFF - isInClient:', liff.isInClient());
        console.log('🔍 LIFF - getOS:', liff.getOS());
        console.log('🔍 LIFF - getLanguage:', liff.getLanguage());
        console.log('🔍 LIFF - getVersion:', liff.getVersion());

        setIsLiffReady(true);
        setIsLoggedIn(liff.isLoggedIn());

        if (liff.isLoggedIn()) {
          console.log('🔍 LIFF - User is logged in, getting profile...');
          const userProfile = await liff.getProfile();
          console.log('🔍 LIFF - Profile retrieved:', userProfile);
          setProfile(userProfile);
          
          // Get context for additional information
          const liffContext = liff.getContext();
          console.log('🔍 LIFF - Context:', liffContext);
          setContext(liffContext);
          
          // Try to get email from ID token
          try {
            const idToken = liff.getIDToken();
            console.log('🔍 LIFF - ID Token exists:', !!idToken);
            if (idToken) {
              const decodedToken = liff.getDecodedIDToken() as LiffDecodedIDToken;
              console.log('🔍 LIFF - Decoded token email:', decodedToken?.email);
              if (decodedToken?.email) {
                setEmail(decodedToken.email);
              }
            }
          } catch (emailErr) {
            console.warn('🔍 LIFF - Could not get email from LIFF ID token:', emailErr);
          }
        } else {
          console.log('🔍 LIFF - User is not logged in');
        }
      } catch (err) {
        console.error('🔍 LIFF - Initialization failed:', err);
        console.error('🔍 LIFF - Error details:', {
          name: err instanceof Error ? err.name : 'Unknown',
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : 'No stack trace'
        });
        setError(err instanceof Error ? err.message : 'LIFF initialization failed');
      }
    };

    initLiff();
  }, []);

  const login = () => {
    if (!isLiffReady) return;
    liff.login();
  };

  const logout = () => {
    if (!isLiffReady) return;
    liff.logout();
    setIsLoggedIn(false);
    setProfile(null);
    setEmail(null);
    setContext(null);
  };

  const sendMessage = (message: string) => {
    if (!isLiffReady || !liff.isInClient()) return false;
    
    try {
      liff.sendMessages([{
        type: 'text',
        text: message
      }]);
      return true;
    } catch (err) {
      console.error('Failed to send message:', err);
      return false;
    }
  };

  const shareTargetPicker = (message: string) => {
    if (!isLiffReady) return false;

    try {
      liff.shareTargetPicker([{
        type: 'text',
        text: message
      }]);
      return true;
    } catch (err) {
      console.error('Failed to open share target picker:', err);
      return false;
    }
  };

  return {
    isLiffReady,
    isLoggedIn,
    profile,
    email,
    context,
    error,
    isInClient: isLiffReady ? liff.isInClient() : false,
    login,
    logout,
    sendMessage,
    shareTargetPicker
  };
}