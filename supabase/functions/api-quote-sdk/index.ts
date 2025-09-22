// Rhino.fi SDK Integration - Quote Endpoint
import { RhinoSdk, SupportedTokens, SupportedChains } from 'https://esm.sh/@rhino.fi/sdk';
import { getEvmChainAdapterFromPrivateKey } from 'https://esm.sh/@rhino.fi/sdk/adapters/evm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Initialize Rhino SDK with API key from environment
function getRhinoSdk() {
  const apiKey = Deno.env.get('RHINO_API_KEY');
  if (!apiKey) {
    throw new Error('RHINO_API_KEY environment variable is required');
  }
  console.log('✓ Creating Rhino SDK with API key');
  return RhinoSdk({
    apiKey
  });
}

// Map display chain names to SDK supported chains
function mapToSdkChain(chainName: string) {
  const chainMap = {
    // Direct API chain mappings using SupportedChains constants
    'ETHEREUM': SupportedChains.ETHEREUM,
    'ARBITRUM': SupportedChains.ARBITRUM_ONE,
    'BASE': SupportedChains.BASE,
    'OPTIMISM': SupportedChains.OPTIMISM,
    'MATIC_POS': SupportedChains.POLYGON,
    'BINANCE': SupportedChains.BNB_SMART_CHAIN,
    'AVALANCHE': SupportedChains.AVALANCHE,
    'LINEA': SupportedChains.LINEA,
    'SCROLL': SupportedChains.SCROLL,
    'BLAST': SupportedChains.BLAST,
    'MANTLE': SupportedChains.MANTLE,
    'TRON': SupportedChains.TRON,
    // Using direct strings for chains that might not be in SupportedChains enum yet
    'GNOSIS': 'GNOSIS',
    'KAIA': 'KAIA',
    // Display name mappings
    'BSC': SupportedChains.BNB_SMART_CHAIN,
    'POLYGON': SupportedChains.POLYGON,
    'MATIC': SupportedChains.POLYGON,
    'BNB': SupportedChains.BNB_SMART_CHAIN,
    'SMART': SupportedChains.BNB_SMART_CHAIN,
    'BNB_SMART_CHAIN': SupportedChains.BNB_SMART_CHAIN,
    'BINANCE_SMART_CHAIN': SupportedChains.BNB_SMART_CHAIN
  };
  
  const upperChainName = chainName?.toUpperCase();
  const mappedChain = chainMap[upperChainName as keyof typeof chainMap];
  
  if (!mappedChain) {
    console.error(`Unsupported chain: ${chainName}`);
    console.error('Available chains:', Object.keys(chainMap));
    throw new Error(`Chain "${chainName}" is not supported. Available chains: ${Object.keys(chainMap).join(', ')}`);
  }
  
  return mappedChain;
}

// Map token symbols to SDK supported tokens
function mapToSdkToken(tokenSymbol: string) {
  const tokenMap = {
    'USDC': SupportedTokens.USDC,
    'USDT': SupportedTokens.USDT,
    'ETH': SupportedTokens.ETH,
    'WETH': SupportedTokens.ETH,
    'WBTC': SupportedTokens.ETH,
    'DAI': SupportedTokens.USDC
  };
  const upperToken = tokenSymbol?.toUpperCase();
  const mappedToken = tokenMap[upperToken as keyof typeof tokenMap];
  if (!mappedToken) {
    throw new Error(`Token "${tokenSymbol}" is not supported for bridging`);
  }
  return mappedToken;
}

// Generate dummy private key for bridgeSwap operations
function getDummyPrivateKey() {
  // 32-byte (64 hex) value with 0x prefix — valid for ethers Wallet
  return '0x0000000000000000000000000000000000000000000000000000000000000001';
}

// Convert BigInt values to strings for JSON serialization
const serializeBigInt = (obj: any): any => {
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = serializeBigInt(obj[key]);
    }
    return result;
  }
  return obj;
};

Deno.serve(async (req) => {
  const startTime = performance.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    console.log('=== INCOMING REQUEST DETAILS ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);
    let requestBody: any = {};
    try {
      requestBody = rawBody ? JSON.parse(rawBody) : {};
    } catch (parseErr) {
      console.error('Invalid JSON body:', (parseErr as Error).message);
      return new Response(JSON.stringify({
        error: 'Invalid JSON',
        message: 'Request body must be valid JSON',
        raw: rawBody?.slice(0, 1000)
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    const { token, chain, amount, tokenConfig, recipientAddress, depositorAddress, chainOut } = requestBody;
    
    // Use chainOut from request - no fallback, require explicit destination
    if (!chainOut) {
      throw new Error('chainOut parameter is required');
    }
    const destinationChain = chainOut;
    const tokenOut = 'USDC';
    
    console.log(`SDK Quote request: ${amount} ${token} on ${chain} → ${destinationChain} (${tokenOut}) [${Math.round(performance.now() - startTime)}ms]`);
    console.log('Token config:', JSON.stringify(tokenConfig, null, 2));
    
    // Use actual addresses when provided, fallback to dummy for safety
    const dummyAddress = '0x0000000000000000000000000000000000000001';
    const finalRecipient = recipientAddress || dummyAddress;
    const finalDepositor = depositorAddress || dummyAddress;
    
    console.log('🔍 Address Debug Info:');
    console.log('  - Recipient (from request):', recipientAddress);
    console.log('  - Depositor (from request):', depositorAddress);
    console.log('  - Final recipient (used by SDK):', finalRecipient);
    console.log('  - Final depositor (used by SDK):', finalDepositor);
    
    // Validate that we have proper addresses for balance checks
    if (!recipientAddress || recipientAddress === dummyAddress) {
      console.warn('⚠️  No valid recipient address provided - using dummy for quote');
    }
    if (!depositorAddress || depositorAddress === dummyAddress) {
      console.warn('⚠️  No valid depositor address provided - using dummy for quote');
    }
    
    // For balance checks, we need real addresses
    if (recipientAddress && recipientAddress !== dummyAddress && depositorAddress && depositorAddress !== dummyAddress) {
      console.log('✅ Using real addresses for accurate balance check');
    } else {
      console.log('⚠️  Using dummy addresses - balance check may not be accurate');
    }

    // Handle unsupported operations
    const sourceChain = chain;

    // Check for same-chain operations (source and destination are the same)
    if (sourceChain?.toUpperCase() === destinationChain?.toUpperCase() && token?.toUpperCase() === tokenOut?.toUpperCase()) {
      console.log(`Same-chain operation: ${token} on ${sourceChain} -> ${tokenOut} on ${destinationChain}`);
      return new Response(JSON.stringify(serializeBigInt({
        direct: true,
        payAmount: amount,
        receiveAmount: amount,
        fees: 0,
        platformFee: 0,
        expiresAt: new Date(Date.now() + 300000),
        message: `No conversion needed - already ${tokenOut} on ${destinationChain}`
      })), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }

    // Check for same-chain operations (source and destination are the same)
    if (sourceChain?.toUpperCase() === destinationChain?.toUpperCase() && token?.toUpperCase() === tokenOut?.toUpperCase()) {
      console.log(`Same-chain operation: ${token} on ${sourceChain} -> ${tokenOut} on ${destinationChain}`);
      return new Response(JSON.stringify(serializeBigInt({
        direct: true,
        payAmount: amount,
        receiveAmount: amount,
        fees: 0,
        platformFee: 0,
        expiresAt: new Date(Date.now() + 300000),
        message: `No conversion needed - already ${tokenOut} on ${destinationChain}`
      })), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }

    // Check for unsupported token types
    const unsupportedTokens = ['WBTC', 'DAI', 'MATIC', 'BNB', 'AVAX', 'TRX'];
    if (unsupportedTokens.includes(token?.toUpperCase())) {
      console.log(`Unsupported token for bridging: ${token}`);
      return new Response(JSON.stringify({
        error: 'Token not supported',
        message: `${token} is not currently supported for bridging to USDC. Please use ETH, USDT, or USDC instead.`,
        suggestedAction: 'Try using a supported token like ETH or USDT'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // Check for unsupported chain combinations specific to Rhino.fi
    const unsupportedChains = ['TRON', 'SOLANA', 'COSMOS', 'NEAR'];
    const upperSourceChain = sourceChain?.toUpperCase();
    if (unsupportedChains.some((chain) => upperSourceChain?.includes(chain))) {
      console.log(`Unsupported source chain: ${sourceChain}`);
      return new Response(JSON.stringify({
        error: 'Chain not supported',
        message: `Bridging from ${sourceChain} is not currently supported. Please use a supported EVM chain.`,
        suggestedAction: 'Try bridging from Ethereum, Arbitrum, Polygon, or another supported EVM chain'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // Check for unsupported destination combinations - removed BASE-specific check
    console.log(`Processing bridge request: ${chain} -> ${destinationChain}, ${token} -> ${tokenOut}`);

    // Check for very small amounts that might fail
    const minAmount = 0.1;
    if (parseFloat(amount) < minAmount) {
      console.log(`Amount too small for bridging: ${amount}`);
      return new Response(JSON.stringify({
        error: 'Amount too small',
        message: `Minimum amount for bridging is ${minAmount} ${token}. Please increase the amount.`,
        suggestedAction: `Enter at least ${minAmount} ${token} to proceed`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // Initialize the Rhino SDK
    console.log('=== INITIALIZING RHINO SDK ===');
    try {
      const rhinoSdk = getRhinoSdk();
      console.log('✓ Rhino SDK initialized successfully');

      // Log available constants for debugging
      console.log('Available SupportedChains:', Object.keys(SupportedChains));
      console.log('Available SupportedTokens:', Object.keys(SupportedTokens));

    // Map to SDK format - no fallbacks
    const fromChain = mapToSdkChain(chain);
    const toChain = mapToSdkChain(destinationChain);
    const fromToken = mapToSdkToken(token);
    const targetToken = SupportedTokens.USDC;

      // Determine if this is a bridge (same token) or bridge-swap (different tokens)
      // IMPORTANT: USDC-to-USDC transfers between chains should always use bridge, not bridgeSwap
      const isBridgeSwap = fromToken !== targetToken && fromToken !== SupportedTokens.USDC;

       console.log('=== MAPPED PARAMETERS ===');
      console.log(`Original chain: ${chain} → Mapped: ${fromChain}`);
      console.log(`Original token: ${token} → Mapped: ${fromToken}`);
      console.log(`Target token: ${targetToken} (always USDC)`);
      console.log(`Target chain: ${toChain} (${destinationChain})`);
      console.log(`Amount: ${amount}`);
      console.log(`Is bridge-swap: ${isBridgeSwap}`);
      console.log(`Operation type: ${isBridgeSwap ? 'bridge-swap' : 'bridge'} (${fromToken} → ${targetToken})`);
      
      // Validate that all required values are present
      if (!fromChain) {
        throw new Error(`fromChain is undefined. Original chain: ${chain}, tokenConfig.chain: ${tokenConfig?.chain}`);
      }
      if (!toChain) {
        throw new Error(`toChain is undefined. destinationChain: ${destinationChain}`);
      }
      if (!fromToken) {
        throw new Error(`fromToken is undefined. Original token: ${token}`);
      }

      // Use prepareBridge SDK method (more robust than direct API calls)
      console.log('=== USING PREPARE BRIDGE WITH REAL EVM ADAPTER ===');
      
      const dummyPrivateKey = getDummyPrivateKey();
      
      console.log('Creating EVM chain adapter with dummy credentials for quote generation');
      
      let preparedBridge;
      
      if (isBridgeSwap) {
        console.log('Preparing bridgeSwap for token conversion using prepareBridge');
        console.log(`Parameters: ${fromToken} → ${targetToken}, ${fromChain} → ${toChain}, amount: ${amount}`);
        
        preparedBridge = await rhinoSdk.prepareBridge({
          type: 'bridgeSwap',
          tokenIn: fromToken,
          tokenOut: targetToken,
          chainIn: fromChain,
          chainOut: toChain,
          amount,
          mode: 'pay',
          depositor: finalDepositor,
          recipient: finalRecipient
        }, {
          getChainAdapter: (chainConfig) => {
            console.log('Creating EVM chain adapter for chain:', chainConfig.chain);
            return getEvmChainAdapterFromPrivateKey(dummyPrivateKey, chainConfig);
          }
        });
      } else {
        console.log('Preparing bridge for same-token transfer using prepareBridge');
        console.log(`Parameters: ${fromToken}, ${fromChain} → ${toChain}, amount: ${amount}`);
        
        const bridgeParams = {
          type: 'bridge',
          token: fromToken,
          chainIn: fromChain,
          chainOut: toChain,
          amount,
          mode: 'pay',
          depositor: finalDepositor,
          recipient: finalRecipient
        };
        
        console.log('🔍 Bridge params being sent to SDK:', JSON.stringify(bridgeParams, null, 2));
        
        preparedBridge = await rhinoSdk.prepareBridge(bridgeParams, {
          getChainAdapter: (chainConfig) => {
            console.log('Creating EVM chain adapter for chain:', chainConfig.chain);
            return getEvmChainAdapterFromPrivateKey(dummyPrivateKey, chainConfig);
          }
        });
      }

      console.log('=== PREPARE BRIDGE RESPONSE ===');
      console.log('Prepared bridge result type:', preparedBridge.type);
      
      const serializedBridge = serializeBigInt(preparedBridge);
      console.log('Prepared bridge result (serialized):', JSON.stringify(serializedBridge, null, 2));

      if (preparedBridge.type === 'error') {
        console.error('SDK Prepare Bridge error:', preparedBridge.error);
        console.error('Error details:', JSON.stringify(serializeBigInt(preparedBridge.error), null, 2));
        throw new Error(`SDK prepareBridge failed: ${JSON.stringify(serializeBigInt(preparedBridge.error))}`);
      }

      if (!preparedBridge.quote) {
        console.error('No quote in prepared bridge result');
        throw new Error('SDK prepareBridge returned no quote');
      }

// Extract quote from the prepared bridge (available in both no-approval-needed and approval-needed cases)
const quote = serializeBigInt(preparedBridge.quote);

      console.log('✅ Quote received successfully');
      console.log('Final quote data:', JSON.stringify(quote, null, 2));

      // Extract quote data according to official documentation
      // First check if this is a bridgeSwap quote by examining _tag field
      let payAmount, receiveAmount, bridgeFees;

      console.log('🔍 Quote _tag:', quote._tag);
      console.log('🔍 Quote mode analysis:');
      console.log('  - User entered amount:', amount);
      console.log('  - SDK payAmount:', quote.payAmount);
      console.log('  - SDK receiveAmount:', quote.receiveAmount);
      console.log('  - If payAmount > entered amount = receive mode behavior');
      console.log('  - If receiveAmount < entered amount = pay mode behavior');

      console.log('Quote type detection - isBridgeSwap:', isBridgeSwap);

      if (quote._tag === 'bridgeSwap') {
        // BridgeSwap quote structure according to official documentation
        console.log('Processing bridgeSwap quote using official documentation structure');
        // Required bridgeSwap fields per documentation:
        payAmount = quote.bridgePayAmount;
        receiveAmount = quote.minReceiveAmount;
        bridgeFees = quote.fees?.fee || quote.fees?.bridgeFee;
        
        console.log('=== BRIDGESWAP QUOTE FIELDS (per documentation) ===');
        console.log('  bridgePayAmount:', quote.bridgePayAmount);
        console.log('  bridgePayAmountUsd:', quote.bridgePayAmountUsd);
        console.log('  minReceiveAmount:', quote.minReceiveAmount);
        console.log('  minReceiveAmountUsd:', quote.minReceiveAmountUsd);
        console.log('  usdPriceTokenIn:', quote.usdPriceTokenIn);
        console.log('  usdPriceTokenOut:', quote.usdPriceTokenOut);

        // Validate required fields exist - throw errors instead of fallbacks
        if (!payAmount) {
          throw new Error('Missing bridgePayAmount in bridgeSwap quote');
        }
        if (!receiveAmount) {
          throw new Error('Missing minReceiveAmount in bridgeSwap quote');
        }
      } else {
        // Regular bridge quote structure - no fallbacks
        console.log('Processing regular bridge quote');
        payAmount = quote.payAmount;
        receiveAmount = quote.receiveAmount;
        bridgeFees = quote.fees?.fee || quote.fees?.bridgeFee;
        
        console.log('=== REGULAR BRIDGE QUOTE FIELDS ===');
        console.log('  payAmount:', quote.payAmount);
        console.log('  receiveAmount:', quote.receiveAmount);
        console.log('  fees:', quote.fees);
        
        // Validate required fields exist - throw errors instead of fallbacks
        if (!payAmount) {
          throw new Error('Missing payAmount in bridge quote');
        }
        if (!receiveAmount) {
          throw new Error('Missing receiveAmount in bridge quote');
        }
      }

        const normalizedQuote = {
          quoteId: quote.quoteId,
          direct: false,
          payAmount: typeof payAmount === 'string' ? payAmount : payAmount.toString(),
          receiveAmount: typeof receiveAmount === 'string' ? receiveAmount : receiveAmount.toString(),
          fees: typeof bridgeFees === 'number' ? bridgeFees : parseFloat(bridgeFees?.toString()),
          platformFee: 0,
          expiresAt: new Date(Date.now() + 300000),
          rhinoData: quote,
          estimatedDuration: quote.estimatedDuration,
          message: isBridgeSwap ? `Converting ${fromToken} to ${targetToken} on ${toChain}` : `Bridging ${fromToken} to ${toChain}`
        };

      const totalTime = performance.now() - startTime;
      console.log(`✅ Quote processed successfully in ${Math.round(totalTime)}ms`);

      return new Response(JSON.stringify(serializeBigInt(normalizedQuote)), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });

    } catch (sdkError) {
      console.error('=== SDK ERROR ===');
      console.error('Error details:', sdkError);
      console.error('Error message:', (sdkError as Error).message);
      console.error('Error stack:', (sdkError as Error).stack);
      
      // Handle specific Rhino SDK errors
      if ((sdkError as any)?.type === 'ChainNotSupported' ||
          (sdkError as any)?.message?.includes('ChainNotSupported') ||
          (sdkError as any)?.originalError?.message?.includes('ChainNotSupported')) {
        return new Response(JSON.stringify(serializeBigInt({
          error: 'Chain not supported',
          message: 'Destination chain GNOSIS is not supported by Rhino.fi for quotes.',
          suggestedAction: 'Choose a supported destination (e.g., Gnosis, Arbitrum, Ethereum) or update the integration.',
        })), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      if ((sdkError as any)?.originalError?.message?.includes('fee config')) {
        return new Response(JSON.stringify(serializeBigInt({
          error: 'Bridge route not available',
          message: `This bridge route (${token} from ${sourceChain} to GNOSIS) is not currently supported by Rhino.fi. Please try a different token or source chain.`,
          suggestedAction: 'Try using ETH or USDT, or bridge from Ethereum/Arbitrum instead'
        })), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 400
        });
      }
      
      throw sdkError;
    }

  } catch (error) {
    console.error('SDK Quote error:', error);
    return new Response(JSON.stringify(serializeBigInt({
      error: 'Failed to get quote',
      message: (error as Error).message,
      stack: (error as Error).stack
    })), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});