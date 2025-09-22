import { supabase } from "@/integrations/supabase/client";
import { RhinoSdk } from "@rhino.fi/sdk";
import { getEvmChainAdapterFromProvider } from "@rhino.fi/sdk/adapters/evm";
import { getEdgeFunctionUrl, getSupabaseHeaders } from "@/config/api-endpoints";

// Helper function to serialize BigInt values
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeBigInt(value);
    }
    return serialized;
  }
  
  return obj;
}

export interface QuoteRequest {
  tokenIn: string;
  tokenOut: string;
  chainIn: string;
  chainOut: string;
  amount: string;
  depositor: string;
  recipient: string;
}

export interface QuoteResponse {
  direct: boolean;
  payAmount: string;
  receiveAmount: string;
  fees: number;
  platformFee: number;
  expiresAt: Date;
  quoteId?: string;
  estimatedDuration?: number;
  message?: string;
  txData?: any;
}

export interface ExecuteRequest {
  quoteId?: string;
  txData?: any;
  userSignature?: string;
  tokenIn: string;
  tokenOut: string;
  chainIn: string;
  chainOut: string;
  amount: string;
  depositor: string;
  recipient: string;
}

export interface ExecuteResponse {
  success: boolean;
  transactionHash?: string;
  bridgeId?: string;
  status: string;
  estimatedDuration?: number;
  message?: string;
}

export interface BridgeStatus {
  status: string;
  progress: number;
  sourceTransactionHash?: string;
  destinationTransactionHash?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  message?: string;
  error?: string;
  updatedAt: string;
}

export interface TokenConfig {
  chains?: Array<{
    id: string;
    name: string;
    displayName: string;
    supported: boolean;
  }>;
  tokens?: Record<string, string[]>;
  chainMapping?: Record<string, string>;
  unsupported?: {
    tokens: string[];
    chains: string[];
    sameChainSwaps: Record<string, string[]>;
  };
}

export const getQuote = async (request: QuoteRequest): Promise<QuoteResponse> => {
  console.log('🔄 Fetching quote from Supabase edge function...');
  
  try {
    // Convert QuoteRequest to the format expected by the edge function
    const payload = {
      token: request.tokenIn,
      chain: request.chainIn,
      chainOut: request.chainOut,
      amount: request.amount,
      tokenConfig: {
        chain: request.chainIn,
        originalChain: request.chainIn
      },
      recipientAddress: request.recipient,
      depositorAddress: request.depositor
    };

    const { data, error } = await supabase.functions.invoke('api-quote-sdk', {
      body: payload
    });
    
    if (error) {
      const anyErr = error as any;
      let status: number | undefined;
      let responseText: string | undefined;
      let responseJson: any;
      try {
        const resp = anyErr?.context?.response;
        if (resp) {
          status = resp.status;
          responseText = await resp.text();
          try { responseJson = JSON.parse(responseText); } catch {}
        } else {
          status = anyErr?.context?.status ?? anyErr?.status;
          if (anyErr?.context?.text) {
            responseText = await anyErr.context.text();
            try { responseJson = JSON.parse(responseText); } catch {}
          }
        }
      } catch {}

      // Log both raw and parsed bodies for full visibility
      console.error('❌ Edge function error (api-quote-sdk):', {
        name: error.name,
        message: error.message,
        status,
        responseText,
        responseJson,
      });
      if (responseJson) {
        console.error('❌ Edge error JSON (stringified):', JSON.stringify(responseJson, null, 2));
      } else if (responseText) {
        console.error('❌ Edge error body (raw):', responseText);
      }

      const surfaced =
        responseJson?.message ||
        responseJson?.error ||
        responseText ||
        error.message ||
        'Failed to get quote';
      throw new Error(surfaced);
    }
      
    
    console.log('✅ Quote received:', data);
    return data as QuoteResponse;
  } catch (error) {
    console.error('Quote fetch error:', error);
    throw error;
  }
};

export const executeBridge = async (request: ExecuteRequest, walletProvider?: any, smartAccountHandler?: any): Promise<ExecuteResponse> => {
  // Ask the Edge Function to normalize parameters and return bridgeData + API key
  const { data, error } = await supabase.functions.invoke('api-bridge-execute', {
    body: request,
  });

  if (error) {
    // Try to surface better error details like in getQuote()
    const anyErr = error as any;
    let status: number | undefined;
    let responseText: string | undefined;
    let responseJson: any;
    try {
      status = anyErr?.context?.status ?? anyErr?.context?.response?.status;
      if (anyErr?.context?.json) {
        try { responseJson = await anyErr.context.json(); } catch {}
      } else if (anyErr?.context?.text) {
        responseText = await anyErr.context.text();
        try { responseJson = JSON.parse(responseText); } catch {}
      }
    } catch {}

    if (status === undefined && !responseText && !responseJson) {
      try {
        const debugUrl = getEdgeFunctionUrl('API_BRIDGE_EXECUTE');
        const debugResp = await fetch(debugUrl, {
          method: 'POST',
          headers: getSupabaseHeaders(),
          body: JSON.stringify(request),
        });
        status = debugResp.status;
        responseText = await debugResp.text();
        try { responseJson = JSON.parse(responseText); } catch {}
        console.error('🔬 Debug direct function call (api-bridge-execute):', { status, responseText: responseText?.slice(0, 2000), responseJson });
      } catch (dbgErr) {
        console.error('🔬 Debug direct function call failed:', dbgErr);
      }
    }

    const surfaced = responseJson?.message || responseText || error.message || 'Failed to execute bridge';
    throw new Error(surfaced);
  }

  const resp: any = data;

  // If we have smart account handler, use that for paymaster-enabled transactions
  if (smartAccountHandler && resp?.success && resp?.bridgeData) {
    console.log('🔄 Using smart account for bridge execution with paymaster support');
    
    try {
      // Use smart account handler for paymaster-enabled transactions
      const result = await smartAccountHandler(resp.bridgeData);
      
      return {
        success: true,
        transactionHash: result?.userOperationHash || result?.transactionHash,
        bridgeId: request.quoteId || request.txData?.quoteId,
        status: 'submitted',
        estimatedDuration: resp?.bridgeData?.estimatedDuration,
        message: resp?.message || 'Bridge submitted via smart account with paymaster',
      };
    } catch (error: any) {
      const errMsg = error?.message || 'Smart account bridge execution error';
      throw new Error(errMsg);
    }
  }

  // If we have a wallet provider, perform the actual bridge client-side to trigger signing
  if (walletProvider && resp?.success && resp?.bridgeData && resp?.rhinoApiKey) {
    const rhinoSdk = RhinoSdk({ apiKey: resp.rhinoApiKey });

    try {
      // Execute the bridge using the connected wallet (will prompt for signature)
      const bridgeResult = await rhinoSdk.bridge(
        resp.bridgeData,
        {
          getChainAdapter: (chainConfig: any) => getEvmChainAdapterFromProvider(walletProvider, chainConfig),
          hooks: {
            onBridgeStatusChange: (status: any) => console.log('🔄 Rhino bridge status:', serializeBigInt(status)),
          },
        }
      );

      if (bridgeResult?.data) {
        const dataAny: any = bridgeResult.data as any;
        const txHash = dataAny.withdrawTxHash || dataAny.depositTxHash || undefined;
        return {
          success: true,
          transactionHash: txHash,
          bridgeId: request.quoteId || request.txData?.quoteId,
          status: 'submitted',
          estimatedDuration: resp?.bridgeData?.estimatedDuration,
          message: resp?.message || 'Bridge submitted',
        };
      }

      const errMsg = (bridgeResult as any)?.error?.message || 
                    (bridgeResult?.error ? JSON.stringify(serializeBigInt(bridgeResult.error)) : 'Bridge execution error');
      throw new Error(errMsg);
    } catch (error: any) {
      // Serialize any BigInt values in the error before throwing
      const serializedError = serializeBigInt(error);
      const errMsg = error?.message || JSON.stringify(serializedError) || 'Bridge execution error';
      throw new Error(errMsg);
    }
  }

  // Fallback: return raw edge function response
  return resp as ExecuteResponse;
};

export const getBridgeStatus = async (bridgeId?: string, transactionHash?: string): Promise<BridgeStatus> => {
  const { data, error } = await supabase.functions.invoke('api-bridge-status', {
    body: { bridgeId, transactionHash }
  });
  if (error) {
    // Surface more details if available
    const anyErr = error as any;
    const details = anyErr?.context?.response ? await anyErr.context.response.text() : error.message;
    throw new Error(details || 'Failed to get bridge status');
  }
  return data as BridgeStatus;
};

export const getTokenConfig = async (type: 'all' | 'chains' | 'tokens' | 'mapping' | 'unsupported' = 'all'): Promise<TokenConfig> => {
  const { data, error } = await supabase.functions.invoke('api-token-configs', {
    body: { type }
  });
  
  if (error) {
    throw new Error(error.message || 'Failed to get token configuration');
  }
  
  return data;
};

// Chain mapping helper
export const mapChainForSDK = (frontendChain: string): string => {
  const chainMap: Record<string, string> = {
    'ETHEREUM': 'ETHEREUM',
    'ARBITRUM': 'ARBITRUM_ONE',
    'BASE': 'BASE', 
    'OPTIMISM': 'OPTIMISM',
    'POLYGON': 'POLYGON_POS',
    'BSC': 'BINANCE',
    'AVALANCHE': 'AVALANCHE_C_CHAIN',
    'GNOSIS': 'GNOSIS',
    'KAIA': 'KAIA'
  };
  
  return chainMap[frontendChain] || frontendChain;
};

// Validation helpers
export const validateBridgeRequest = (request: Partial<QuoteRequest>): string[] => {
  const errors: string[] = [];
  
  if (!request.tokenIn) errors.push('Source token is required');
  if (!request.tokenOut) errors.push('Destination token is required');
  if (!request.chainIn) errors.push('Source chain is required');
  if (!request.chainOut) errors.push('Destination chain is required');
  if (!request.amount) errors.push('Amount is required');
  if (!request.depositor) errors.push('Depositor address is required');
  if (!request.recipient) errors.push('Recipient address is required');
  
  if (request.amount && parseFloat(request.amount) < 0.1) {
    errors.push('Minimum amount is 0.1');
  }
  
  return errors;
};