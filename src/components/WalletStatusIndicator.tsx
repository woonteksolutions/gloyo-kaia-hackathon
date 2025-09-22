import { useEffect, useState } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { useGnosisAuth } from '@/hooks/useGnosisAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, Wifi, WifiOff } from 'lucide-react';

export function WalletStatusIndicator() {
  const { isConnected, address } = useAppKitAccount();
  const {
    isWalletResponsive,
    isWalletWaiting,
    walletError,
    checkWalletResponsiveness,
    handleUnresponsiveWallet
  } = useGnosisAuth();

  const [showDetailedStatus, setShowDetailedStatus] = useState(false);
  const [isCheckingResponsiveness, setIsCheckingResponsiveness] = useState(false);

  // Auto-check responsiveness when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      const timer = setTimeout(() => {
        checkWalletResponsiveness();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isConnected, address, checkWalletResponsiveness]);

  const handleCheckResponsiveness = async () => {
    setIsCheckingResponsiveness(true);
    try {
      await checkWalletResponsiveness();
    } finally {
      setIsCheckingResponsiveness(false);
    }
  };

  const handleReconnect = async () => {
    try {
      await handleUnresponsiveWallet();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Compact Status Indicator */}
      <div 
        className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setShowDetailedStatus(!showDetailedStatus)}
      >
        <div className="flex items-center gap-2">
          {isWalletWaiting || isCheckingResponsiveness ? (
            <Loader2 className="w-4 h-4 animate-spin text-warning" />
          ) : isWalletResponsive ? (
            <Wifi className="w-4 h-4 text-success" />
          ) : (
            <WifiOff className="w-4 h-4 text-destructive" />
          )}
          
          <span className="text-sm font-medium">
            {isWalletWaiting || isCheckingResponsiveness 
              ? 'Checking wallet...' 
              : isWalletResponsive 
                ? 'Wallet responsive' 
                : 'Wallet unresponsive'
            }
          </span>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <div className={`w-2 h-2 rounded-full ${
            isWalletWaiting || isCheckingResponsiveness
              ? 'bg-warning animate-pulse'
              : isWalletResponsive
                ? 'bg-success'
                : 'bg-destructive'
          }`} />
          <span className="text-xs text-muted-foreground">
            {showDetailedStatus ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {/* Detailed Status */}
      {showDetailedStatus && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Address: {address?.slice(0, 6)}...{address?.slice(-4)}</div>
            <div>Status: {isWalletResponsive ? 'Connected & Responsive' : 'Connected but Unresponsive'}</div>
          </div>

          {walletError && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                {walletError}
              </AlertDescription>
            </Alert>
          )}

          {!isWalletResponsive && (
            <Alert className="py-2">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                Your wallet may be unresponsive. This can happen if your wallet app is closed, 
                locked, or experiencing connection issues.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckResponsiveness}
              disabled={isCheckingResponsiveness}
              className="flex-1 h-8 text-xs"
            >
              {isCheckingResponsiveness ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Test Connection
                </>
              )}
            </Button>

            {!isWalletResponsive && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReconnect}
                className="flex-1 h-8 text-xs"
              >
                <Wifi className="w-3 h-3 mr-1" />
                Reconnect
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}