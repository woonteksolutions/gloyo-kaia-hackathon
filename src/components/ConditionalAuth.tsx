import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Wallet, Globe } from "lucide-react";
import { LiffCDPAuth } from "./LiffCDPAuth";
import { DappPortalCDPAuth } from "./DappPortalCDPAuth";
import { Button } from "@/components/ui/button";
import { useEnvironmentDetection } from "@/hooks/useEnvironmentDetection";
import { useAppKit } from '@reown/appkit/react';

interface ConditionalAuthProps {
  onExternalWalletConnect?: () => void;
}

export function ConditionalAuth({ onExternalWalletConnect }: ConditionalAuthProps) {
  const { environment, isDetecting } = useEnvironmentDetection();
  const { open } = useAppKit();

  const handleExternalWallet = () => {
    if (onExternalWalletConnect) {
      onExternalWalletConnect();
    } else {
      open();
    }
  };

  if (isDetecting) {
    return (
      <Card className="mobile-card border-0 shadow-mobile-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-mobile-xl">Detecting Environment...</CardTitle>
          <CardDescription className="text-base">
            Please wait while we determine the best authentication method
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (environment === 'liff') {
    return <LiffCDPAuth />;
  }

  if (environment === 'dappportal') {
    return <DappPortalCDPAuth />;
  }

  // Default web environment - show unified authentication options
  return (
    <Card className="mobile-card border-0 shadow-mobile-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-mobile-xl">
          <Globe className="h-5 w-5" />
          Web Authentication
        </CardTitle>
        <CardDescription className="text-base">
          Choose your preferred authentication method
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          onClick={handleExternalWallet} 
          className="w-full"
          size="lg"
        >
          <Wallet className="h-4 w-4 mr-2" />
          Connect External Wallet
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          Connect with MetaMask, WalletConnect, or other Web3 wallets
        </div>
      </CardContent>
    </Card>
  );
}