import { useDappPortal } from '@/hooks/useDappPortal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function DappPortalStatus() {
  const { 
    isReady, 
    error, 
    isSupportedBrowser, 
    getWalletProvider, 
    getPaymentProvider 
  } = useDappPortal();

  const handleWalletProvider = () => {
    const provider = getWalletProvider();
    console.log('Wallet Provider:', provider);
  };

  const handlePaymentProvider = () => {
    const provider = getPaymentProvider();
    console.log('Payment Provider:', provider);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>DappPortal SDK Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!isReady) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>DappPortal SDK</AlertTitle>
        <AlertDescription>Initializing...</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>DappPortal SDK Ready</AlertTitle>
        <AlertDescription>
          SDK initialized successfully.
          <div className="mt-2">
            <Badge variant={isSupportedBrowser ? "default" : "destructive"}>
              {isSupportedBrowser ? "Browser Supported" : "Browser Not Supported"}
            </Badge>
          </div>
        </AlertDescription>
      </Alert>

      <div className="flex gap-2">
        <Button onClick={handleWalletProvider} variant="outline" size="sm">
          Get Wallet Provider
        </Button>
        <Button onClick={handlePaymentProvider} variant="outline" size="sm">
          Get Payment Provider
        </Button>
      </div>
    </div>
  );
}