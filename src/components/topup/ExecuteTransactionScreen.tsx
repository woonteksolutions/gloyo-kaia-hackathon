import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import { useAppKitAccount, useAppKitProvider, useAppKitNetwork } from '@reown/appkit/react';
import { BrowserProvider } from 'ethers';
import { QuoteRequest, QuoteResponse, ExecuteRequest, executeBridge, getBridgeStatus, BridgeStatus } from '@/services/rhinoService';
import { useSmartAccountTopUpWithPaymaster } from '@/hooks/useSmartAccountTopUpWithPaymaster';
import { useCDPWallet } from '@/hooks/useCDPWallet';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatAddress } from '@/lib/formatters';
import { networkMap, getExplorerUrl } from '@/lib/chainUtils';

interface ExecuteTransactionScreenProps {
  quoteRequest: QuoteRequest;
  quote: QuoteResponse;
  onComplete?: () => void;
}

type ExecutionStep = 'confirm' | 'signing' | 'broadcasting' | 'bridging' | 'complete' | 'error';

export default function ExecuteTransactionScreen({ 
  quoteRequest, 
  quote, 
  onComplete 
}: ExecuteTransactionScreenProps) {
  const { address } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const { switchNetwork } = useAppKitNetwork();
  const { hasSmartAccount, smartAccountAddress } = useCDPWallet();
  const { executeTopUp, status: smartAccountStatus, error: smartAccountError, isPaymasterSupported } = useSmartAccountTopUpWithPaymaster();
  const [currentStep, setCurrentStep] = useState<ExecutionStep>('confirm');
  const [progress, setProgress] = useState(0);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [bridgeId, setBridgeId] = useState<string | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();
  
  // Determine if we should use smart account flow
  const shouldUseSmartAccount = hasSmartAccount && smartAccountAddress;
  
  // Check if paymaster is supported for the source network
  const paymasterAvailable = isPaymasterSupported(quoteRequest.chainIn);


  // Poll bridge status
  useEffect(() => {
    if ((bridgeId || transactionHash) && currentStep === 'bridging') {
      const interval = setInterval(async () => {
        try {
          const status = await getBridgeStatus((bridgeId || quote.quoteId), transactionHash || undefined);
          setBridgeStatus(status);
          
          // Handle different completion status values for bridge vs bridgeSwap
          const isCompleted = status.status === 'completed' || 
                             status.status === 'success' || 
                             status.status === 'finished' ||
                             status.progress >= 100;
          
          const isFailed = status.status === 'failed' || 
                          status.status === 'error' ||
                          status.error;
          
          if (isCompleted) {
            setCurrentStep('complete');
            setProgress(100);
            clearInterval(interval);
            toast({
              title: "Bridge Complete",
              description: `Successfully bridged ${quote.receiveAmount} ${quoteRequest.tokenOut}`,
            });
          } else if (isFailed) {
            setCurrentStep('error');
            setError(status.error || status.message || 'Bridge transaction failed');
            clearInterval(interval);
            toast({
              title: "Bridge Failed",
              description: status.error || 'Bridge transaction failed',
              variant: "destructive",
            });
          } else {
            // Update progress based on status
            const progressValue = status.progress || 
                                 (status.status === 'pending' ? 25 : 
                                  status.status === 'processing' ? 50 : 
                                  status.status === 'confirming' ? 75 : 50);
            setProgress(progressValue);
          }
        } catch (err) {
          console.error('Status check failed:', err);
          // Don't clear interval on temporary errors, keep checking
        }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [bridgeId, transactionHash, currentStep, quote.receiveAmount, quote.quoteId, quoteRequest.tokenOut, toast]);

  const executeBridgeTransaction = useCallback(async () => {
    if (!address && !smartAccountAddress) {
      setError('Wallet not connected');
      setCurrentStep('error');
      return;
    }

    try {
      setCurrentStep('signing');
      setProgress(10);

      // Smart Account Flow (Embedded Wallet with Paymaster)
      if (shouldUseSmartAccount) {
        console.log('🔄 Using smart account for bridge with paymaster support');
        
        // Create smart account handler for the bridge service
        const smartAccountHandler = async (bridgeData: any) => {
          // For now, we'll create a simple approve transaction
          // TODO: Integrate with Rhino.fi's exact contract calls
          const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC address (example)
          const spenderAddress = '0x...'; // Rhino.fi contract address (would come from bridgeData)
          const amount = BigInt(quote.payAmount.replace(/[^0-9]/g, '') || '0');
          
          return await executeTopUp({
            tokenAddress: tokenAddress as `0x${string}`,
            spenderAddress: spenderAddress as `0x${string}`, 
            amount,
            network: quoteRequest.chainIn
          });
        };

        setCurrentStep('broadcasting');
        setProgress(30);

        // Prepare execution request
        const executeRequest: ExecuteRequest = {
          ...quoteRequest,
          quoteId: quote.quoteId,
          txData: quote.txData
        };

        // Execute bridge with smart account handler
        const result = await executeBridge(executeRequest, walletProvider, smartAccountHandler);
        
        if (result.success) {
          setTransactionHash(result.transactionHash);
          setBridgeId(result.bridgeId || quote.quoteId || null);
          setCurrentStep('bridging');
          setProgress(50);
          
          toast({
            title: "Transaction Submitted",
            description: paymasterAvailable ? 
              "Your bridge transaction has been submitted using smart account with paymaster" :
              "Your bridge transaction has been submitted using smart account",
          });
        } else {
          throw new Error('Smart account bridge execution failed');
        }
        
      } else {
        // Traditional Wallet Flow
        if (!walletProvider) {
          setError('Wallet not connected');
          setCurrentStep('error');
          return;
        }

        // Check if we need to switch networks
        const expectedNetwork = networkMap[quoteRequest.chainIn];
        if (expectedNetwork && switchNetwork) {
          try {
            await switchNetwork(expectedNetwork);
            // Wait a moment for network switch to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (networkError) {
            console.error('Network switch failed:', networkError);
            setError(`Please switch to ${quoteRequest.chainIn} network to continue`);
            setCurrentStep('error');
            return;
          }
        }

        setCurrentStep('broadcasting');
        setProgress(30);

        // Prepare execution request
        const executeRequest: ExecuteRequest = {
          ...quoteRequest,
          quoteId: quote.quoteId,
          txData: quote.txData
        };

        // If we need user signature for complex transactions
        if (quote.txData && walletProvider) {
          try {
            const ethersProvider = new BrowserProvider(walletProvider as any);
            const signer = await ethersProvider.getSigner();
            
            // Sign if required
            if (quote.txData.requiresSignature) {
              const signature = await signer.signMessage(quote.txData.messageToSign);
              executeRequest.userSignature = signature;
            }
          } catch (signingError) {
            console.error('Signing error:', signingError);
            // Continue without signature if not critical
          }
        }

        // Execute bridge (pass walletProvider to trigger signing)
        const result = await executeBridge(executeRequest, walletProvider);
        
        if (result.success) {
          setTransactionHash(result.transactionHash);
          setBridgeId(result.bridgeId || quote.quoteId || null);
          setCurrentStep('bridging');
          setProgress(50);
          
          toast({
            title: "Transaction Submitted",
            description: "Your bridge transaction has been submitted",
          });
        } else {
          throw new Error('Bridge execution failed');
        }
      }

    } catch (err: any) {
      console.error('Bridge execution error:', err);
      
      // Handle network mismatch errors specifically
      if (err.message && err.message.includes('WrongNetworkOnChainAdapter')) {
        setError(`Network mismatch. Please ensure your wallet is on ${quoteRequest.chainIn} network.`);
      } else {
        setError(err.message || 'Failed to execute bridge transaction');
      }
      
      setCurrentStep('error');
      setProgress(0);
      
      toast({
        title: "Transaction Failed",
        description: err.message || 'Failed to execute bridge transaction',
        variant: "destructive",
      });
    }
  }, [address, smartAccountAddress, walletProvider, shouldUseSmartAccount, executeTopUp, quoteRequest, quote, toast, switchNetwork]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setError(null);
    setCurrentStep('confirm');
    setProgress(0);
    setTransactionHash(null);
    setBridgeId(null);
    setBridgeStatus(null);
    
    // Wait a moment before allowing retry
    setTimeout(() => {
      setIsRetrying(false);
    }, 1000);
  };

  const getStepStatus = (step: ExecutionStep) => {
    const stepOrder: ExecutionStep[] = ['confirm', 'signing', 'broadcasting', 'bridging', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);
    
    if (currentStep === 'error') return 'error';
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Transaction Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Bridge Transaction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">From</h4>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium">
                    {formatCurrency(quote.payAmount)} {quoteRequest.tokenIn}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {quoteRequest.chainIn}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">To</h4>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="font-medium text-green-700">
                    {formatCurrency(quote.receiveAmount)} {quoteRequest.tokenOut}
                  </div>
                  <div className="text-sm text-green-600">
                    {quoteRequest.chainOut}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Paymaster Info */}
            {shouldUseSmartAccount && (
              <div className={`p-3 border rounded-lg ${paymasterAvailable ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`h-4 w-4 ${paymasterAvailable ? 'text-blue-600' : 'text-orange-600'}`} />
                  <span className={`text-sm font-medium ${paymasterAvailable ? 'text-blue-700' : 'text-orange-700'}`}>
                    {paymasterAvailable ? 'Gas Sponsored by Paymaster' : 'Smart Account (Gas Required)'}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${paymasterAvailable ? 'text-blue-600' : 'text-orange-600'}`}>
                  {paymasterAvailable ? 
                    'No ETH required for transaction fees' : 
                    `Paymaster only available on Base network. You'll need ${quoteRequest.chainIn} gas for fees.`
                  }
                </p>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            
            {/* Step indicators */}
            <div className="space-y-2">
              {[
                { step: 'confirm' as ExecutionStep, label: 'Confirm transaction' },
                { step: 'signing' as ExecutionStep, label: 'Sign transaction' },
                { step: 'broadcasting' as ExecutionStep, label: 'Broadcasting to network' },
                { step: 'bridging' as ExecutionStep, label: 'Processing bridge' },
                { step: 'complete' as ExecutionStep, label: 'Complete' }
              ].map(({ step, label }) => {
                const status = getStepStatus(step);
                return (
                  <div key={step} className="flex items-center gap-3">
                    {status === 'complete' && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {status === 'active' && <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />}
                    {status === 'pending' && <Clock className="h-5 w-5 text-muted-foreground" />}
                    {status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                    <span className={`text-sm ${status === 'active' ? 'font-medium' : 'text-muted-foreground'}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bridge Status */}
      {bridgeStatus && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Bridge Status</span>
                <Badge variant={bridgeStatus.status === 'completed' ? 'default' : 'secondary'}>
                  {bridgeStatus.status}
                </Badge>
              </div>
              
              {bridgeStatus.sourceTransactionHash && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Source TX:</span>
                   <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => window.open(getExplorerUrl(bridgeStatus.sourceTransactionHash!, quoteRequest.chainIn), '_blank')}
                  >
                    {formatAddress(bridgeStatus.sourceTransactionHash)}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
              
              {bridgeStatus.destinationTransactionHash && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Destination TX:</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => window.open(getExplorerUrl(bridgeStatus.destinationTransactionHash!, quoteRequest.chainOut), '_blank')}
                  >
                    {formatAddress(bridgeStatus.destinationTransactionHash)}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && currentStep === 'error' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-red-700">Transaction Failed</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex-1 flex flex-col justify-end pt-4 space-y-2">
        {currentStep === 'confirm' && (
          <Button
            className="w-full"
            onClick={executeBridgeTransaction}
            disabled={isRetrying}
          >
            {isRetrying ? 'Preparing...' : shouldUseSmartAccount ? 
              (paymasterAvailable ? 'Execute Bridge Transaction (Gasless)' : 'Execute Bridge Transaction (Smart Account)') : 
              'Execute Bridge Transaction'
            }
          </Button>
        )}

        {currentStep === 'error' && (
          <Button
            className="w-full"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying...' : 'Retry Transaction'}
          </Button>
        )}

        {currentStep === 'complete' && (
          <Button
            className="w-full"
            onClick={onComplete}
          >
            Done
          </Button>
        )}

        {['signing', 'broadcasting', 'bridging'].includes(currentStep) && (
          <Button
            variant="outline"
            className="w-full"
            onClick={onComplete}
          >
            Continue in Background
          </Button>
        )}
      </div>
    </div>
  );
}