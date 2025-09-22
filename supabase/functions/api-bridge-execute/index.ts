import { RhinoSdk } from 'https://esm.sh/@rhino.fi/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const getRhinoSdkFromEnv = () => {
  const apiKey = Deno.env.get('RHINO_API_KEY');
  if (!apiKey) {
    throw new Error('RHINO_API_KEY environment variable is required');
  }
  return RhinoSdk({
    apiKey
  });
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const requestBody = await req.json();
    
    // Handle ExecuteRequest format from frontend
    const token = requestBody.tokenIn;
    const chain = requestBody.chainIn;
    const chainOut = requestBody.chainOut;
    const amount = requestBody.amount;
    const walletAddress = requestBody.depositor;
    const recipientAddress = requestBody.recipient;
    const quote = requestBody.txData || { quoteId: requestBody.quoteId };

    console.log('=== BRIDGE EXECUTION REQUEST DEBUG ===');
    console.log('🔍 Raw Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('🔍 Parsed Parameters:');
    console.log('  - Token (tokenIn):', token);
    console.log('  - Chain (chainIn):', chain);
    console.log('  - Chain Out (chainOut):', chainOut);
    console.log('  - Amount:', amount);
    console.log('  - Wallet Address (depositor):', walletAddress);
    console.log('  - Recipient Address (recipient):', recipientAddress);
    console.log('🔍 Quote Object Structure:');
    console.log('  - Quote Type:', typeof quote);
    console.log('  - Quote Keys:', quote ? Object.keys(quote) : 'null');
    console.log('  - Full Quote:', JSON.stringify(quote, null, 2));

    // Use recipient address as provided - no fallback
    const finalRecipient = recipientAddress;

    console.log('🏠 Recipient Address Logic:');
    console.log('  - Provided recipient:', recipientAddress || 'None');
    console.log('  - Final recipient:', finalRecipient);

    // Validate required parameters (ExecuteRequest fields)  
    if (!token || !chain || !chainOut || !amount || !walletAddress || !recipientAddress) {
      console.error('❌ Missing required parameters');
      console.error('Missing:', {
        token: !token,
        chain: !chain,
        chainOut: !chainOut,
        amount: !amount,
        walletAddress: !walletAddress,
        recipientAddress: !recipientAddress
      });
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameters: token, chain, chainOut, amount, walletAddress, recipientAddress'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Get Rhino SDK instance to validate configuration
    const rhinoSdk = getRhinoSdkFromEnv();

    // Map chain names to Rhino supported chains
    const chainMapping = {
      'BSC': 'BINANCE',
      'ETHEREUM': 'ETHEREUM',
      'ARBITRUM': 'ARBITRUM_ONE',
      'BASE': 'BASE',
      'POLYGON': 'POLYGON',
      'OPTIMISM': 'OPTIMISM',
      'GNOSIS': 'GNOSIS',
      'KAIA': 'KAIA'
    };

    const rhinoChainIn = chainMapping[chain];
    const rhinoChainOut = chainMapping[chainOut];
    
    if (!rhinoChainIn) {
      throw new Error(`Unsupported source chain: ${chain}. Supported chains: ${Object.keys(chainMapping).join(', ')}`);
    }
    
    if (!rhinoChainOut) {
      throw new Error(`Unsupported destination chain: ${chainOut}. Supported chains: ${Object.keys(chainMapping).join(', ')}`);
    }

    console.log('🔗 Chain mapping:');
    console.log('  - Original chain in:', chain);
    console.log('  - Original chain out:', chainOut);
    console.log('  - Rhino chain in:', rhinoChainIn);
    console.log('  - Rhino chain out:', rhinoChainOut);

    // Determine bridge type based on user instructions:
    // - USDC source: use Bridge (same token cross-chain)
    // - USDT source: use BridgeSwap (token conversion to USDC)
    // - Kaia USDT: use BridgeSwap (token conversion to USDC)
    const isTokenConversion = token !== 'USDC'; // If not USDC, we need bridgeSwap
    const bridgeType = isTokenConversion ? 'bridgeSwap' : 'bridge';

    console.log('🔄 Bridge type determination:');
    console.log('  - Source token:', token);
    console.log('  - Target token: USDC');
    console.log('  - Is token conversion needed:', isTokenConversion);
    console.log('  - Bridge type:', bridgeType);

    // Construct bridge data based on type
    let bridgeData;

    if (bridgeType === 'bridgeSwap') {
      // For bridgeSwap (token conversion), we need tokenIn and tokenOut
      bridgeData = {
        type: 'bridgeSwap',
        tokenIn: token,
        tokenOut: 'USDC',
        chainIn: rhinoChainIn,
        chainOut: rhinoChainOut,
        amount: amount,
        mode: 'pay',
        depositor: walletAddress,
        recipient: finalRecipient
      };
    } else {
      // For regular bridge (same token), we need token field
      bridgeData = {
        type: 'bridge',
        token: token,
        chainIn: rhinoChainIn,
        chainOut: rhinoChainOut,
        amount: amount,
        mode: 'pay',
        depositor: walletAddress,
        recipient: finalRecipient
      };
    }

    console.log('🌉 Bridge data constructed:', JSON.stringify(bridgeData, null, 2));

    // Skip SDK route validation here; Rhino SDK will validate during prepareBridge on client
    console.log('⚠️ Skipping server-side Rhino route validation; deferring to prepareBridge on client');

    console.log('📍 Final recipient address:', finalRecipient);
    console.log(`💰 Tokens will be received as USDC at recipient address on ${chainOut} chain`);
    console.log('✅ Returning validated bridge data for frontend execution');

    return new Response(JSON.stringify({
      success: true,
      bridgeData: bridgeData,
      rhinoApiKey: Deno.env.get('RHINO_API_KEY'),
      message: 'Bridge data prepared. Frontend should call prepareBridge with wallet chain adapter.'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('💥 Bridge execution error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.toString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});