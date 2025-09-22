import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chain mapping from frontend to SDK - based on Rhino.fi supported chains
const chainMap = {
  'ETHEREUM': 'ETHEREUM',
  'ARBITRUM': 'ARBITRUM_ONE',
  'BASE': 'BASE', 
  'OPTIMISM': 'OPTIMISM',
  'POLYGON': 'POLYGON_POS',
  'BSC': 'BINANCE',
  'AVALANCHE': 'AVALANCHE_C_CHAIN',
  'GNOSIS': 'GNOSIS',
  'LINEA': 'LINEA',
  'SCROLL': 'SCROLL',
  'BLAST': 'BLAST',
  'MANTLE': 'MANTLE',
  'TRON': 'TRON',
  'KAIA': 'KAIA'
};

// NOTE: This is a static configuration that should be updated based on Rhino.fi's actual supported tokens
// For dynamic configuration, consider fetching from Rhino.fi API directly
const tokenConfig = {
  'ETHEREUM': ['USDT', 'USDC', 'ETH'],
  'ARBITRUM': ['USDT', 'USDC', 'ETH'],
  'BASE': ['USDT', 'USDC', 'ETH'], // Updated to include USDT
  'OPTIMISM': ['USDT', 'USDC', 'ETH'],
  'POLYGON': ['USDT', 'USDC'],
  'BSC': ['USDT', 'USDC'],
  'AVALANCHE': ['USDT', 'USDC'],
  'GNOSIS': ['USDC', 'xDAI'],
  'LINEA': ['USDT', 'USDC', 'ETH'],
  'SCROLL': ['USDT', 'USDC', 'ETH'],
  'BLAST': ['USDT', 'USDC', 'ETH'],
  'MANTLE': ['USDT', 'USDC'],
  'TRON': ['USDT', 'USDC'],
  'KAIA': ['USDT']
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type = 'all' } = await req.json().catch(() => ({}));

    let response = {};

    if (type === 'chains' || type === 'all') {
      response = {
        ...response,
        chains: Object.keys(chainMap).map(chain => ({
          id: chain,
          name: chain,
          displayName: chain.charAt(0) + chain.slice(1).toLowerCase(),
          supported: true
        }))
      };
    }

    if (type === 'tokens' || type === 'all') {
      response = {
        ...response,
        tokens: tokenConfig
      };
    }

    if (type === 'mapping' || type === 'all') {
      response = {
        ...response,
        chainMapping: chainMap
      };
    }

    // Add unsupported items for error handling
    // NOTE: These restrictions should be verified against current Rhino.fi API capabilities
    if (type === 'unsupported' || type === 'all') {
      response = {
        ...response,
          unsupported: {
            tokens: ['WBTC', 'DAI', 'MATIC', 'BNB', 'AVAX', 'TRX'],
            chains: ['SOLANA', 'COSMOS', 'NEAR'],
            sameChainSwaps: {
              // Removed BASE restriction - same-chain swaps may be supported
              // 'BASE': ['USDT', 'USDC'] 
            }
          }
      };
    }

    console.log('🦏 Token config response:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Token config error:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to get token configuration',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});