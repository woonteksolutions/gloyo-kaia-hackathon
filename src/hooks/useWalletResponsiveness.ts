import { useState, useCallback } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

interface WalletTimeoutConfig {
  signingTimeout: number; // Default 30 seconds
  connectionTimeout: number; // Default 10 seconds
  maxRetries: number; // Default 3 attempts
}

interface WalletResponsivenessState {
  isResponsive: boolean;
  lastResponseTime?: Date;
  retryCount: number;
  isWaiting: boolean;
  error?: string;
}

export function useWalletResponsiveness(config: Partial<WalletTimeoutConfig> = {}) {
  const { open, close } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  
  const finalConfig: WalletTimeoutConfig = {
    signingTimeout: config.signingTimeout || 30000, // 30 seconds
    connectionTimeout: config.connectionTimeout || 10000, // 10 seconds
    maxRetries: config.maxRetries || 3,
  };

  const [state, setState] = useState<WalletResponsivenessState>({
    isResponsive: true,
    retryCount: 0,
    isWaiting: false,
  });

  /**
   * Wrapper for wallet operations with timeout and retry logic
   */
  const withWalletTimeout = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    timeout = finalConfig.signingTimeout
  ): Promise<T> => {
    setState(prev => ({ ...prev, isWaiting: true, error: undefined }));

    return new Promise((resolve, reject) => {
      let isResolved = false;
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          setState(prev => ({ 
            ...prev, 
            isWaiting: false,
            isResponsive: false,
            error: `Wallet not responding to ${operationName} request (${timeout/1000}s timeout)`
          }));
          reject(new Error(`Wallet timeout: ${operationName} took longer than ${timeout/1000} seconds`));
        }
      }, timeout);

      // Execute operation
      operation()
        .then(result => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeoutId);
            setState(prev => ({ 
              ...prev, 
              isWaiting: false,
              isResponsive: true,
              lastResponseTime: new Date(),
              retryCount: 0,
              error: undefined
            }));
            resolve(result);
          }
        })
        .catch(error => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeoutId);
            setState(prev => ({ 
              ...prev, 
              isWaiting: false,
              isResponsive: false,
              error: error.message || 'Wallet operation failed'
            }));
            reject(error);
          }
        });
    });
  }, [finalConfig.signingTimeout]);

  /**
   * Retry mechanism for failed operations
   */
  const retryOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    if (state.retryCount >= finalConfig.maxRetries) {
      throw new Error(`Max retries (${finalConfig.maxRetries}) exceeded for ${operationName}`);
    }

    setState(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));
    
    try {
      return await withWalletTimeout(operation, operationName);
    } catch (error) {
      if (state.retryCount < finalConfig.maxRetries) {
        console.log(`Retrying ${operationName} (attempt ${state.retryCount + 1}/${finalConfig.maxRetries})`);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, state.retryCount) * 1000));
        return retryOperation(operation, operationName);
      }
      throw error;
    }
  }, [state.retryCount, finalConfig.maxRetries, withWalletTimeout]);

  /**
   * Check if wallet is still responsive by testing a simple operation
   */
  const checkWalletResponsiveness = useCallback(async (): Promise<boolean> => {
    if (!isConnected || !address) {
      return false;
    }

    try {
      // Test wallet responsiveness with a lightweight operation
      await withWalletTimeout(
        async () => {
          // Try to get the current account (should be immediate if wallet is responsive)
          return address;
        },
        'responsiveness check',
        5000 // Short timeout for responsiveness check
      );
      return true;
    } catch (error) {
      console.warn('Wallet responsiveness check failed:', error);
      return false;
    }
  }, [isConnected, address, withWalletTimeout]);

  /**
   * Handle wallet reconnection when it becomes unresponsive
   */
  const handleUnresponsiveWallet = useCallback(async () => {
    console.log('🔄 Handling unresponsive wallet...');
    
    try {
      // Close current connection
      close();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to reconnect
      await withWalletTimeout(
        async () => {
          await open();
          // Wait for connection to establish
          await new Promise(resolve => setTimeout(resolve, 2000));
        },
        'reconnection',
        finalConfig.connectionTimeout
      );

      console.log('✅ Wallet reconnection successful');
      return true;
    } catch (error) {
      console.error('❌ Wallet reconnection failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to reconnect wallet. Please manually disconnect and reconnect.' 
      }));
      return false;
    }
  }, [open, close, withWalletTimeout, finalConfig.connectionTimeout]);

  /**
   * Enhanced signing with timeout and retry
   */
  const signWithTimeout = useCallback(async (
    walletProvider: any,
    method: string,
    params: any[]
  ): Promise<string> => {
    return retryOperation(
      async () => {
        return await walletProvider.request({
          method,
          params
        });
      },
      `wallet signing (${method})`
    );
  }, [retryOperation]);

  /**
   * Reset wallet state
   */
  const resetWalletState = useCallback(() => {
    setState({
      isResponsive: true,
      retryCount: 0,
      isWaiting: false,
      error: undefined
    });
  }, []);

  return {
    // State
    ...state,
    
    // Methods
    withWalletTimeout,
    retryOperation,
    checkWalletResponsiveness,
    handleUnresponsiveWallet,
    signWithTimeout,
    resetWalletState,
    
    // Config
    config: finalConfig
  };
}