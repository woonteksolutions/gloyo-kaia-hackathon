import { useEnvironmentDetection } from '@/hooks/useEnvironmentDetection';
import { LiffCDPAuth } from './LiffCDPAuth';
import { DappPortalCDPAuth } from './DappPortalCDPAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Globe, MessageCircle, Smartphone } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';

interface UniversalAuthProps {
  onAuthSuccess?: () => void;
}

export function UniversalAuth({ onAuthSuccess }: UniversalAuthProps) {
  const { environment, isDetecting } = useEnvironmentDetection();
  const { open } = useAppKit();

  const handleExternalWallet = () => {
    open();
  };

  if (isDetecting) {
    return (
      <Card className="mobile-card border-0 shadow-mobile-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-mobile-xl">Initializing...</CardTitle>
          <CardDescription className="text-base">
            Detecting your environment for the best authentication experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // LIFF Environment (LINE app)
  if (environment === 'liff') {
    return (
      <div className="space-y-4">
        <Card className="mobile-card border-0 shadow-mobile-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-mobile-xl">
              <MessageCircle className="h-5 w-5" />
              LINE Authentication
            </CardTitle>
            <CardDescription className="text-base">
              Create embedded wallet or connect external wallet
            </CardDescription>
          </CardHeader>
        </Card>
        <LiffCDPAuth />
      </div>
    );
  }

  // DappPortal Environment (LINE Mini Dapp)
  if (environment === 'dappportal') {
    return (
      <div className="space-y-4">
        <Card className="mobile-card border-0 shadow-mobile-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-mobile-xl">
              <Smartphone className="h-5 w-5" />
              Mini Dapp Portal
            </CardTitle>
            <CardDescription className="text-base">
              Create embedded wallet or connect external wallet
            </CardDescription>
          </CardHeader>
        </Card>
        <DappPortalCDPAuth />
      </div>
    );
  }

  // Web Environment
  return (
    <Card className="mobile-card border-0 shadow-mobile-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-mobile-xl">
          <Globe className="h-5 w-5" />
          Web3 Authentication
        </CardTitle>
        <CardDescription className="text-base">
          Connect your wallet to access the decentralized ecosystem
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleExternalWallet} 
          className="w-full"
          size="lg"
        >
          <Wallet className="h-4 w-4 mr-2" />
          Connect Wallet
        </Button>
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Supported wallets:
          </p>
          <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
            <span>MetaMask</span>
            <span>•</span>
            <span>WalletConnect</span>
            <span>•</span>
            <span>Coinbase Wallet</span>
            <span>•</span>
            <span>Hardware Wallets</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}