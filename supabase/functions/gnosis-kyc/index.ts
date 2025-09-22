import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const url = new URL(req.url);
    const path = url.pathname.replace('/gnosis-kyc', '');
    
    console.log(`🚀 Gnosis KYC: ${req.method} ${path}`);

    if (path === '/integration' && req.method === 'GET') {
      return handleGetKYCIntegration(req);
    } else if (path === '/user' && req.method === 'GET') {
      return handleGetUser(req);
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('🚨 Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleGetKYCIntegration(req: Request) {
  try {
    console.log('🚀 [EDGE] KYC Integration handler called');
    console.log('🚀 [EDGE] Request URL:', req.url);
    console.log('🚀 [EDGE] Request method:', req.method);
    
    const authHeader = req.headers.get('Authorization');
    console.log('🚀 [EDGE] Auth header:', authHeader ? `PRESENT: ${authHeader.substring(0, 50)}...` : 'MISSING');
    
    // Since verify_jwt = false, we should accept any token format
    if (!authHeader) {
      console.error('🚨 [EDGE] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    console.log('🚀 [EDGE] Extracted token:', token ? `${token.substring(0, 30)}...` : 'EMPTY');

    // Get language parameter if provided
    const url = new URL(req.url);
    const lang = url.searchParams.get('lang') || 'en';
    
    console.log('🔍 [EDGE] Calling REAL Gnosis Pay KYC API...');
    const gnosisUrl = `https://api.gnosispay.com/api/v1/kyc/integration?lang=${lang}`;
    console.log('🚀 [EDGE] Gnosis API URL:', gnosisUrl);
    
    // Call the REAL Gnosis Pay API
    const gnosisResponse = await fetch(gnosisUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    console.log(`🚀 [EDGE] Gnosis API response status: ${gnosisResponse.status}`);
    
    if (!gnosisResponse.ok) {
      const errorText = await gnosisResponse.text();
      console.error('🚨 [EDGE] Gnosis API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Gnosis Pay API error',
          status: gnosisResponse.status,
          details: errorText
        }),
        { 
          status: gnosisResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const gnosisData = await gnosisResponse.json();
    console.log('✅ [EDGE] Real Gnosis KYC data:', gnosisData);
    
    // Return the EXACT response from Gnosis Pay
    return new Response(
      JSON.stringify(gnosisData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('🚨 [EDGE] Error in KYC integration handler:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get KYC integration', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleGetUser(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // In real implementation, extract user from validated JWT
    // For now, return mock user data
    const userData = {
      id: 'user_' + Date.now(),
      email: 'user@example.com',
      kycStatus: 'pending',
      isPhoneValidated: false,
      termsAccepted: true,
      safeAddress: null,
      hasCard: false
    };
    
    console.log(`👤 Fetched user data: ${userData.id}`);
    
    return new Response(
      JSON.stringify(userData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('🚨 Error fetching user:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch user data' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function generateSumsubAccessToken(userId: string): Promise<string> {
  // This is where you'd integrate with the real Sumsub API
  // For now, returning a mock token that the iframe can use
  
  const SUMSUB_APP_TOKEN = Deno.env.get('SUMSUB_APP_TOKEN');
  const SUMSUB_SECRET_KEY = Deno.env.get('SUMSUB_SECRET_KEY');
  
  if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
    console.log('⚠️ Sumsub credentials not configured, using mock token');
    return `mock_token_${userId}_${Date.now()}`;
  }

  try {
    // Real Sumsub integration would go here
    // This is a simplified example - you'd need to implement proper Sumsub SDK calls
    
    const requestBody = {
      userId: userId,
      ttlInSecs: 3600, // 1 hour
      levelName: 'basic-kyc-level' // Configure this in your Sumsub dashboard
    };

    // In production, you'd make the actual API call to Sumsub here
    // For now, return a formatted mock token
    return `sumsub_${userId}_${Date.now()}`;
    
  } catch (error) {
    console.error('🚨 Sumsub API error:', error);
    throw new Error('Failed to generate Sumsub token');
  }
}