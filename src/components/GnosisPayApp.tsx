import { useState, useEffect } from 'react';
import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { useAppKitAccount } from '@reown/appkit/react';
import { useCDPWallet } from '@/hooks/useCDPWallet';
import { useEnvironmentDetection } from '@/hooks/useEnvironmentDetection';
import Auth from '@/pages/Auth';
import Terms from '@/pages/Terms';
import KYC from '@/pages/KYC';
import SourceOfFunds from '@/pages/SourceOfFunds';
import EmailVerification from '@/pages/EmailVerification';
import PhoneVerification from '@/pages/PhoneVerification';
import SafeSetup from '@/pages/SafeSetup';
import CardOrder from '@/pages/CardOrder';
import Dashboard from '@/pages/Dashboard';

export default function GnosisPayApp() {
  const { currentStep } = useGnosisPay();
  const { isConnected } = useAppKitAccount();
  const { isSignedIn } = useCDPWallet();
  const { isLiff } = useEnvironmentDetection();
  
  // Listen for LIFF wallet connection events (avoid duplicate LIFF hook initialization)
  const [lineWalletConnected, setLineWalletConnected] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('liffWalletConnected') === '1';
  });
  const [lineWalletAddress, setLineWalletAddress] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('liffWalletAddress') : null;
  });
  useEffect(() => {
    const handleConnected = (e: any) => {
      setLineWalletConnected(true);
      setLineWalletAddress(e?.detail?.address ?? localStorage.getItem('liffWalletAddress'));
    };
    const handleDisconnected = () => {
      setLineWalletConnected(false);
      setLineWalletAddress(null);
    };
    window.addEventListener('liffWalletConnected', handleConnected as EventListener);
    window.addEventListener('liffWalletDisconnected', handleDisconnected);
    return () => {
      window.removeEventListener('liffWalletConnected', handleConnected as EventListener);
      window.removeEventListener('liffWalletDisconnected', handleDisconnected);
    };
  }, []);

  const isLineWalletConnected = isLiff && lineWalletConnected && !!lineWalletAddress;

  const renderCurrentStep = () => {
    console.log('🚀 GNOSIS-APP - Current step:', currentStep);
    console.log('🚀 GNOSIS-APP - Wallet status:', { 
      isConnected, 
      isSignedIn, 
      isLiff,
      isLineWalletConnected,
      lineWalletConnected,
      lineWalletAddress 
    });
    
    // If user has a wallet connected but hasn't started Gnosis flow, show Dashboard
    const hasWalletConnected = isConnected || isSignedIn || isLineWalletConnected;
    
    console.log('🚀 GNOSIS-APP - hasWalletConnected:', hasWalletConnected);
    console.log('🚀 GNOSIS-APP - Will show Dashboard?', hasWalletConnected && currentStep === 'auth');
    
    // Show Dashboard if wallet is connected and we're on auth step (before Gnosis onboarding)
    if (hasWalletConnected && currentStep === 'auth') {
      return <Dashboard />;
    }
    
    // Handle Gnosis onboarding flow steps
    switch (currentStep) {
      case 'auth':
        return <Auth />;
      case 'email-verification':
        return <EmailVerification />;
      case 'terms':
        return <Terms />;
      case 'kyc':
        return <KYC />;
      case 'source-of-funds':
        return <SourceOfFunds />;
      case 'phone-verification':
        return <PhoneVerification />;
      case 'safe-setup':
        return <SafeSetup />;
      case 'card-order':
        return <CardOrder />;
      case 'dashboard':
        return <Dashboard />;
      default:
        return <Auth />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderCurrentStep()}
    </div>
  );
}