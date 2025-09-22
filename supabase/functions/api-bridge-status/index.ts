import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { RhinoSdk } from 'https://esm.sh/@rhino.fi/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rhinoApiKey = Deno.env.get('RHINO_API_KEY');
    if (!rhinoApiKey) {
      throw new Error('RHINO_API_KEY not found');
    }

    const { bridgeId, transactionHash } = await req.json().catch(() => ({}));

    if (!bridgeId && !transactionHash) {
      return new Response(JSON.stringify({
        error: 'bridgeId or transactionHash required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🦏 Checking bridge status for:', { bridgeId, transactionHash });

    // Initialize Rhino SDK
    const rhinoSdk = RhinoSdk({
      apiKey: rhinoApiKey
    });

    let status;
    if (bridgeId) {
      // For bridge operations with bridgeId
      status = await rhinoSdk.getBridgeStatus(bridgeId);
      console.log('🔍 Bridge status by ID:', status);
    } else if (transactionHash) {
      // TX-hash lookup isn't supported by some SDK versions.
      // Prefer tracking by bridgeId (quoteId) when available.
      const anySdk = rhinoSdk as any;
      if (typeof anySdk.getTransactionStatus === 'function') {
        status = await anySdk.getTransactionStatus(transactionHash);
        console.log('🔍 Bridge status by TX hash:', status);
      } else {
        return new Response(JSON.stringify({
          error: 'transactionHash lookup not supported',
          message: 'Please provide bridgeId (quoteId) to track status.',
          transactionHash
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      throw new Error('Either bridgeId or transactionHash is required');
    }

    // Normalize status response for both bridge and bridgeSwap operations
    const state = (status && (status.status || status.state)) || 'PENDING';
    const progress = typeof status?.progress === 'number'
      ? status.progress
      : state === 'EXECUTED' || state === 'COMPLETED' ? 100
      : state === 'ACCEPTED' ? 60
      : state === 'PENDING' ? 25
      : 50;

    const normalizedStatus = {
      status: (state || 'PENDING').toString().toLowerCase() === 'executed' ? 'completed'
            : (state || '').toString().toLowerCase(),
      progress,
      sourceTransactionHash: status?.sourceTransactionHash || status?.depositTxHash || status?.txHash || transactionHash,
      destinationTransactionHash: status?.destinationTransactionHash || status?.withdrawTxHash || status?.destinationTxHash,
      estimatedDuration: status?.estimatedDuration,
      actualDuration: status?.actualDuration,
      message: status?.message,
      error: status?.error,
      updatedAt: status?.updatedAt || new Date().toISOString()
    };

    console.log('🦏 Normalized bridge status result:', normalizedStatus);

    return new Response(JSON.stringify(normalizedStatus), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Bridge status error:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to get bridge status',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});