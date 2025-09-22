import { useState, useEffect } from 'react';

declare global {
  interface Window {
    liff?: any;
  }
}

export type AuthEnvironment = 'liff' | 'dappportal' | 'web';

export function useEnvironmentDetection() {
  const [environment, setEnvironment] = useState<AuthEnvironment>('web');
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    const detectEnvironment = () => {
      try {
        console.log('🔍 ENV - Starting environment detection...');
        console.log('🔍 ENV - window.liff exists:', !!window.liff);
        console.log('🔍 ENV - user agent:', navigator.userAgent);
        console.log('🔍 ENV - hostname:', window.location.hostname);
        console.log('🔍 ENV - URL params:', window.location.search);
        console.log('🔍 ENV - referrer:', document.referrer);
        
        // Check if we're in LIFF environment
        if (window.liff) {
          console.log('🔍 ENV - Detected LIFF environment via window.liff');
          setEnvironment('liff');
          setIsDetecting(false);
          return;
        }

        // Check for DappPortal specific parameters or referrer
        const urlParams = new URLSearchParams(window.location.search);
        const referrer = document.referrer;
        
        // Check if coming from DappPortal or using minidapp parameter
        if (
          urlParams.get('source') === 'dappportal' ||
          urlParams.get('env') === 'minidapp' ||
          urlParams.get('minidapp') === 'true' ||
          urlParams.get('dappportal') === 'true' ||
          referrer.includes('dappportal') ||
          // Allow localhost testing with URL parameters
          (window.location.hostname === 'localhost' && urlParams.has('minidapp'))
        ) {
          console.log('🔍 ENV - Detected DappPortal environment via URL params');
          setEnvironment('dappportal');
          setIsDetecting(false);
          return;
        }

        // Check user agent for LINE app
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Line/')) {
          console.log('🔍 ENV - Detected LIFF environment via user agent');
          setEnvironment('liff');
          setIsDetecting(false);
          return;
        }

        // Default to web environment
        console.log('🔍 ENV - Defaulting to web environment');
        setEnvironment('web');
        setIsDetecting(false);
      } catch (error) {
        console.error('🔍 ENV - Environment detection error:', error);
        setEnvironment('web');
        setIsDetecting(false);
      }
    };

    // Small delay to allow LIFF to initialize if present
    const timer = setTimeout(() => {
      console.log('🔍 ENV - Timer triggered for environment detection');
      detectEnvironment();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return {
    environment,
    isDetecting,
    isLiff: environment === 'liff',
    isDappPortal: environment === 'dappportal',
    isWeb: environment === 'web'
  };
}