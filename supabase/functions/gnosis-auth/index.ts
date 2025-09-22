import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { decode } from "https://deno.land/x/djwt@v3.0.2/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
}

serve(async (req) => {
  console.log('🚀 Gnosis Auth Proxy: Request received');
  console.log('🚀 Method:', req.method);
  console.log('🚀 URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🚀 Handling CORS preflight');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.replace('/gnosis-auth', '')
    console.log('🚀 Extracted path:', path);
    
    if (path === '/nonce') {
      console.log('🚀 Processing nonce request');
      
      try {
        // According to Gnosis Pay docs: GET /api/v1/auth/nonce
        // This endpoint should be public and not require authentication
        console.log('🚀 Calling Gnosis Pay nonce endpoint...');
        
        // First, let's test if the domain is even reachable
        console.log('🚀 Testing basic connectivity to api.gnosispay.com...');
        try {
          const testResponse = await fetch('https://api.gnosispay.com/', {
            method: 'GET',
            headers: {
              'User-Agent': 'Gnosis-Pay-Integration/1.0'
            }
          });
          console.log('🚀 Basic connectivity test status:', testResponse.status);
          const testText = await testResponse.text();
          console.log('🚀 Basic connectivity response (first 100 chars):', testText.substring(0, 100));
        } catch (testError) {
          console.error('🚀 Basic connectivity failed:', testError);
        }
        
        // Now try the nonce endpoint with different headers
        const response = await fetch('https://api.gnosispay.com/api/v1/auth/nonce', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; Gnosis-Pay-Integration/1.0)',
            // Remove Content-Type for GET request
          }
        })
        
        console.log('🚀 Gnosis nonce response status:', response.status);
        console.log('🚀 Gnosis nonce response headers:', Object.fromEntries(response.headers.entries()));
        
        // Get the raw response text to see exactly what we're getting
        const responseText = await response.text();
        console.log('🚀 Gnosis nonce raw response (first 200 chars):', responseText.substring(0, 200));
        console.log('🚀 Gnosis nonce response content-type:', response.headers.get('content-type'));
        
        if (!response.ok) {
          console.error('🚀 Gnosis nonce error - Status:', response.status);
          console.error('🚀 Gnosis nonce error - Response:', responseText);
          
          // If 401, it means the API itself might be down or changed
          if (response.status === 401) {
            return new Response(JSON.stringify({ 
              error: 'Gnosis Pay API authentication issue',
              details: 'The nonce endpoint returned 401. This might indicate API changes or service issues.',
              status: response.status,
              suggestion: 'Check if Gnosis Pay API is operational or if endpoint has changed',
              rawResponse: responseText.substring(0, 500)
            }), {
              status: 502, // Bad Gateway - external service issue
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
              },
            });
          }
          
          return new Response(JSON.stringify({ 
            error: `Gnosis Pay API error: ${response.status}`,
            details: responseText,
            status: response.status,
            rawResponse: responseText.substring(0, 500)
          }), {
            status: response.status,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }
        
        // Try to parse the response as JSON first, if that fails, treat as plain text nonce
        let data;
        try {
          data = JSON.parse(responseText);
          console.log('🚀 Gnosis nonce parsed as JSON:', data);
        } catch (parseError) {
          console.log('🚀 Response is not JSON, treating as plain text nonce');
          // If it's not JSON, the response text might be the nonce itself
          // Check if it looks like a valid nonce (alphanumeric string)
          if (responseText && responseText.trim().length > 0) {
            const nonce = responseText.trim();
            console.log('🚀 Using plain text as nonce:', nonce);
            data = { nonce: nonce };
          } else {
            console.error('🚀 Empty or invalid response from Gnosis Pay');
            return new Response(JSON.stringify({ 
              error: 'Invalid nonce response from Gnosis Pay',
              details: `Received empty or invalid response: \"${responseText}\"`,
              rawResponse: responseText.substring(0, 500)
            }), {
              status: 502,
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
              },
            });
          }
        }
        
        return new Response(JSON.stringify(data), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        })
        
      } catch (error) {
        console.error('🚀 Error fetching nonce:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch nonce from Gnosis Pay',
          details: error.message,
          suggestion: 'Check network connectivity and Gnosis Pay API status'
        }), {
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
      }
    }
    
    if (path === '/challenge' && req.method === 'POST') {
      console.log('🚀 Processing challenge request');
      
      try {
        const body = await req.json()
        console.log('🚀 Challenge request body keys:', Object.keys(body));
        console.log('🚀 Challenge message length:', body.message ? body.message.length : 'NO MESSAGE');
        console.log('🚀 Challenge signature length:', body.signature ? body.signature.length : 'NO SIGNATURE');
        
        // Validate required fields
        if (!body.message || !body.signature) {
          return new Response(JSON.stringify({ 
            error: 'Missing required fields',
            details: 'Both message and signature are required'
          }), {
            status: 400,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }
        
        // POST /api/v1/auth/challenge according to Gnosis Pay docs
        const response = await fetch('https://api.gnosispay.com/api/v1/auth/challenge', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })
        
        console.log('🚀 Gnosis challenge response status:', response.status);
        
        const responseText = await response.text();
        console.log('🚀 Gnosis challenge response status:', response.status);
        console.log('🚀 Gnosis challenge response:', responseText);
        
        if (!response.ok) {
          console.error('🚀 Gnosis challenge failed - Status:', response.status);
          console.error('🚀 Gnosis challenge failed - Response:', responseText);
          
          // Parse the error response to get more details
          let errorDetails = responseText;
          try {
            const errorObj = JSON.parse(responseText);
            console.error('🚀 Parsed Gnosis error:', JSON.stringify(errorObj, null, 2));
            errorDetails = errorObj.message || errorObj.error || errorObj.detail || responseText;
          } catch (parseErr) {
            console.log('🚀 Error response is not JSON:', parseErr.message);
          }
          
          // Try to parse the error response
          let errorData;
          try {
            errorData = JSON.parse(responseText);
            console.log('🚀 Gnosis challenge parsed error:', errorData);
          } catch (parseError) {
            console.log('🚀 Could not parse error as JSON:', parseError.message);
          }
          
          // Handle specific Gnosis Pay API errors
          if (response.status === 401) {
            return new Response(JSON.stringify({ 
              error: 'Authentication failed',
              details: 'The signature verification failed or the signer is not a Gnosis Pay account owner.',
              status: response.status,
              suggestion: 'Ensure the wallet address is registered with Gnosis Pay and the signature is valid'
            }), {
              status: 401,
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
              },
            });
          }
          
          if (response.status === 422) {
            return new Response(JSON.stringify({ 
              error: 'Validation Error',
              details: errorDetails,
              status: response.status,
              suggestion: 'SIWE message format may be incorrect. Check domain, chain ID, or message structure.',
              fullResponse: responseText
            }), {
              status: 422,
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
              },
            });
          }
          
          if (response.status === 403) {
            return new Response(JSON.stringify({ 
              error: 'WAF Forbidden',
              details: 'Request blocked by Gnosis Pay firewall. Check domain/URI in SIWE message.',
              status: response.status,
              suggestion: 'Ensure domain and URI are not localhost/127.0.0.1 in the SIWE message'
            }), {
              status: 403,
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
              },
            });
          }
          
          return new Response(JSON.stringify({ 
            error: `Gnosis Pay API error: ${response.status}`,
            details: errorData || responseText,
            status: response.status
          }), {
            status: response.status,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }
        
        let data;
        try {
          data = JSON.parse(responseText);
          console.log('🚀 Gnosis challenge success - Response data:', data);
          console.log('🚀 Response keys:', Object.keys(data));
          console.log('🚀 JWT field:', data.jwt ? 'Present' : 'Missing');
        } catch (parseError) {
          console.error('🚀 Could not parse success response as JSON:', parseError.message);
          console.log('🚀 Raw success response:', responseText);
          return new Response(JSON.stringify({ 
            error: 'Invalid response format from Gnosis Pay',
            details: 'Expected JSON response but got: ' + responseText.substring(0, 200)
          }), {
            status: 502,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }
        
        return new Response(JSON.stringify(data), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        })
        
      } catch (error) {
        console.error('🚀 Challenge error:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to process challenge',
          details: error.message
        }), {
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
      }
    }

    // Helper function to decode and analyze JWT
    const analyzeJWT = (jwtToken: string) => {
      try {
        const [header, payload] = decode(jwtToken);
        console.log('🚀 JWT Header:', header);
        console.log('🚀 JWT Payload:', payload);
        
        // Check if user already has userId (already registered)
        const hasUserId = payload && typeof payload === 'object' && 'userId' in payload;
        console.log('🚀 JWT has userId:', hasUserId);
        
        return {
          valid: true,
          hasUserId,
          payload,
          signerAddress: payload && typeof payload === 'object' ? payload.signerAddress : null
        };
      } catch (error) {
        console.error('🚀 JWT decode error:', error);
        return { valid: false, error: error.message };
      }
    };

    if (path === '/user' && req.method === 'GET') {
      console.log('🚀 Processing user check request');
      
      try {
        // Get JWT from Authorization header
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return new Response(JSON.stringify({ 
            error: 'Missing authentication',
            details: 'Bearer token is required'
          }), {
            status: 401,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }

        const jwt = authHeader.substring(7);
        console.log('🚀 Checking user registration status with JWT');
        
        // Analyze the JWT first
        const jwtAnalysis = analyzeJWT(jwt);
        console.log('🚀 JWT Analysis:', jwtAnalysis);
        
        // GET /api/v1/user according to Gnosis Pay docs
        const response = await fetch('https://api.gnosispay.com/api/v1/user', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
        })
        
        console.log('🚀 Gnosis user check response status:', response.status);
        
        if (response.status === 401) {
          console.log('🚀 User not registered for this signer address (401 response)');
          console.log('🚀 Current signer address:', jwtAnalysis.signerAddress);
          return new Response(JSON.stringify({ 
            registered: false,
            message: `User not registered for signer address: ${jwtAnalysis.signerAddress}`,
            details: 'Each wallet signer address must be registered separately with Gnosis Pay. You may need to use the original wallet you signed up with, or register this new signer address.',
            signerAddress: jwtAnalysis.signerAddress,
            jwtAnalysis,
            nextStep: 'signup'
          }), {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🚀 Gnosis user check error:', errorText);
          
          return new Response(JSON.stringify({ 
            error: `Gnosis Pay user check error: ${response.status}`,
            details: errorText,
            status: response.status,
            jwtAnalysis
          }), {
            status: response.status,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }
        
        const userData = await response.json();
        console.log('🚀 User already registered - Response data:', userData);
        
        return new Response(JSON.stringify(userData), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
        
      } catch (error) {
        console.error('🚀 User check error:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to check user registration',
          details: error.message
        }), {
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
      }
    }

    // Signup endpoints for new user registration (no auth required)
    if (path === '/signup/otp' && req.method === 'POST') {
      console.log('🚀 Processing signup OTP request');
      
      try {
        const body = await req.json();
        console.log('🚀 Signup OTP body keys:', Object.keys(body));
        
        // POST /api/v1/auth/signup/otp according to Gnosis Pay docs - no auth required for sending OTP
        const response = await fetch('https://api.gnosispay.com/api/v1/auth/signup/otp', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })
        
        console.log('🚀 Gnosis signup OTP response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🚀 Gnosis signup OTP error:', errorText);
          
          return new Response(JSON.stringify({ 
            error: `Gnosis Pay signup OTP error: ${response.status}`,
            details: errorText,
            status: response.status
          }), {
            status: response.status,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }
        
        const responseData = await response.json();
        console.log('🚀 Signup OTP success:', responseData);
        
        return new Response(JSON.stringify(responseData), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
        
      } catch (error) {
        console.error('🚀 Signup OTP error:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to send signup OTP',
          details: error.message
        }), {
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
      }
    }

    if (path === '/signup/otp' && req.method === 'GET') {
      console.log('🚀 Processing signup OTP verification request');
      
      try {
        const urlParams = new URLSearchParams(url.search);
        const queryString = urlParams.toString();
        console.log('🚀 OTP verification query string:', queryString);
        
        // GET /api/v1/auth/signup/otp with query parameters - no auth required
        const response = await fetch(`https://api.gnosispay.com/api/v1/auth/signup/otp?${queryString}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        })
        
        console.log('🚀 Gnosis signup OTP verification response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🚀 Gnosis signup OTP verification error:', errorText);
          
          return new Response(JSON.stringify({ 
            error: `Gnosis Pay signup OTP verification error: ${response.status}`,
            details: errorText,
            status: response.status
          }), {
            status: response.status,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }
        
        const responseData = await response.json();
        console.log('🚀 Signup OTP verification success:', responseData);
        
        return new Response(JSON.stringify(responseData), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
        
      } catch (error) {
        console.error('🚀 Signup OTP verification error:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to verify signup OTP',
          details: error.message
        }), {
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
      }
    }

    // All other endpoints require authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ 
        error: 'Missing authentication',
        details: 'Bearer token is required'
      }), {
        status: 401,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      });
    }

    const jwt = authHeader.substring(7);

    // Account balances endpoint
    if (path === '/account-balances' && req.method === 'GET') {
      console.log('🚀 Processing account balances request');
      
      try {
        // GET /api/v1/account-balances according to Gnosis Pay docs
        const response = await fetch('https://api.gnosispay.com/api/v1/account-balances', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
        })
        
        console.log('🚀 Gnosis account balances response status:', response.status);
        
        const responseText = await response.text();
        console.log('🚀 Gnosis account balances response:', responseText.substring(0, 200) + '...');
        
        if (!response.ok) {
          console.error('🚀 Gnosis account balances error:', responseText);
          
          return new Response(JSON.stringify({ 
            error: `Failed to fetch account balances: ${response.status}`,
            details: responseText,
            status: response.status
          }), {
            status: response.status,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }
        
        const balancesData = JSON.parse(responseText);
        console.log('🚀 Account balances success:', balancesData);
        
        return new Response(JSON.stringify(balancesData), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
        
      } catch (error) {
        console.error('🚀 Account balances error:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch account balances',
          details: error.message
        }), {
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
      }
    }

    // Cards listing endpoint
    if (path === '/cards' && req.method === 'GET') {
      console.log('🚀 Processing cards listing request');
      
      try {
        // GET /api/v1/cards according to Gnosis Pay docs
        const response = await fetch('https://api.gnosispay.com/api/v1/cards', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
        })
        
        console.log('🚀 Gnosis cards response status:', response.status);
        
        const responseText = await response.text();
        console.log('🚀 Gnosis cards response:', responseText.substring(0, 200) + '...');
        
        if (!response.ok) {
          console.error('🚀 Gnosis cards error:', responseText);
          
          return new Response(JSON.stringify({ 
            error: `Failed to fetch cards: ${response.status}`,
            details: responseText,
            status: response.status
          }), {
            status: response.status,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }
        
        const cardsData = JSON.parse(responseText);
        console.log('🚀 Cards listing success:', cardsData);
        
        return new Response(JSON.stringify(cardsData), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
        
      } catch (error) {
        console.error('🚀 Cards listing error:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch cards',
          details: error.message
        }), {
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
      }
    }

    // Card Management Endpoints - NEW FUNCTIONALITY
    if (path.startsWith('/cards/') && path.includes('/activate') && req.method === 'POST') {
      console.log('🚀 Processing card activate request');
      return await handleCardAction(req, jwt, path, 'POST');
    }
    
    if (path.startsWith('/cards/') && path.includes('/freeze') && req.method === 'POST') {
      console.log('🚀 Processing card freeze request');
      return await handleCardAction(req, jwt, path, 'POST');
    }
    
    if (path.startsWith('/cards/') && path.includes('/unfreeze') && req.method === 'POST') {
      console.log('🚀 Processing card unfreeze request');
      return await handleCardAction(req, jwt, path, 'POST');
    }
    
    if (path.startsWith('/cards/') && path.includes('/void') && req.method === 'POST') {
      console.log('🚀 Processing card void request');
      return await handleCardAction(req, jwt, path, 'POST');
    }
    
    if (path.startsWith('/cards/') && path.includes('/lost') && req.method === 'POST') {
      console.log('🚀 Processing card lost report request');
      return await handleCardAction(req, jwt, path, 'POST');
    }
    
    if (path.startsWith('/cards/') && path.includes('/stolen') && req.method === 'POST') {
      console.log('🚀 Processing card stolen report request');
      return await handleCardAction(req, jwt, path, 'POST');
    }
    
    if (path.startsWith('/cards/') && path.includes('/status') && req.method === 'GET') {
      console.log('🚀 Processing card status request');
      return await handleCardAction(req, jwt, path, 'GET');
    }
    
    if (path === '/cards/transactions' && req.method === 'GET') {
      console.log('🚀 Processing card transactions request');
      return await handleCardTransactions(req, jwt, url);
    }

    // Virtual card creation endpoint
    if (path === '/cards/virtual' && req.method === 'POST') {
      console.log('🚀 Processing virtual card creation request');
      return await handleCardAction(req, jwt, path, 'POST');
    }

    // Existing Onboarding Endpoints
    if (path === '/user/terms' && req.method === 'GET') {
      console.log('🚀 Processing user terms request');
      
      try {
        const jwtAnalysis = analyzeJWT(jwt);
        console.log('🚀 JWT Analysis for terms:', jwtAnalysis);
        
        // GET /api/v1/user/terms according to Gnosis Pay docs
        const response = await fetch('https://api.gnosispay.com/api/v1/user/terms', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
        })
        
        console.log('🚀 Gnosis user terms response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🚀 Gnosis user terms error:', errorText);
          
          return new Response(JSON.stringify({ 
            error: `Gnosis Pay terms error: ${response.status}`,
            details: errorText,
            status: response.status
          }), {
            status: response.status,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }
        
        const termsData = await response.json();
        console.log('🚀 User terms response data:', termsData);
        
        return new Response(JSON.stringify(termsData), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
        
      } catch (error) {
        console.error('🚀 User terms error:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to check terms status',
          details: error.message
        }), {
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
      }
    }

    if (path === '/user/terms' && req.method === 'POST') {
      console.log('🚀 Processing terms acceptance');
      
      try {
        const body = await req.json();
        console.log('🚀 Terms acceptance body:', body);
        
        // POST /api/v1/user/terms according to Gnosis Pay docs
        const response = await fetch('https://api.gnosispay.com/api/v1/user/terms', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
          body: JSON.stringify(body),
        })
        
        console.log('🚀 Gnosis terms acceptance response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🚀 Gnosis terms acceptance error:', errorText);
          
          return new Response(JSON.stringify({ 
            error: `Gnosis Pay terms acceptance error: ${response.status}`,
            details: errorText,
            status: response.status
          }), {
            status: response.status,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }
        
        const responseData = await response.json();
        console.log('🚀 Terms acceptance success:', responseData);
        
        return new Response(JSON.stringify(responseData), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
        
      } catch (error) {
        console.error('🚀 Terms acceptance error:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to accept terms',
          details: error.message
        }), {
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
      }
    }

    // Add the /safe-config endpoint for both GET and PATCH requests
    if (path === '/safe-config' && req.method === 'GET') {
      console.log('🚀 Processing safe config GET request');
      
      try {
        // GET /api/v1/safe-config according to Gnosis Pay docs
        const response = await fetch('https://api.gnosispay.com/api/v1/safe-config', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
        })
        
        console.log('🚀 Gnosis safe config response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🚀 Gnosis safe config error:', errorText);
          
          return new Response(JSON.stringify({ 
            error: `Gnosis Pay safe config error: ${response.status}`,
            details: errorText,
            status: response.status
          }), {
            status: response.status,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }
        
        const safeConfigData = await response.json();
        console.log('🚀 Safe config response data:', safeConfigData);
        
        return new Response(JSON.stringify(safeConfigData), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
        
      } catch (error) {
        console.error('🚀 Safe config error:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to get safe config',
          details: error.message
        }), {
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
      }
    }

    if (path === '/account/deploy-safe-modules' && req.method === 'PATCH') {
      console.log('🚀 Processing safe modules deployment request');
      
      try {
        const body = await req.json();
        console.log('🚀 Safe modules deployment body keys:', Object.keys(body));
        
        // Validate required fields
        if (!body.signature) {
          return new Response(JSON.stringify({ 
            error: 'Missing signature',
            details: 'Signature is required for safe modules deployment'
          }), {
            status: 400,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }

        // PATCH /api/v1/account/deploy-safe-modules according to Gnosis Pay docs
        const response = await fetch('https://api.gnosispay.com/api/v1/account/deploy-safe-modules', {
          method: 'PATCH',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
          body: JSON.stringify(body),
        })
        
        console.log('🚀 Gnosis safe modules deployment response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🚀 Gnosis safe modules deployment error:', errorText);
          
          return new Response(JSON.stringify({ 
            error: `Gnosis Pay safe modules deployment error: ${response.status}`,
            details: errorText,
            status: response.status
          }), {
            status: response.status,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }
        
        const deploymentData = await response.json();
        console.log('🚀 Safe modules deployment success:', deploymentData);
        
        return new Response(JSON.stringify(deploymentData), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
        
      } catch (error) {
        console.error('🚀 Safe modules deployment error:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to deploy safe modules',
          details: error.message
        }), {
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
      }
    }

    if (path === '/signup' && req.method === 'POST') {
      console.log('🚀 Processing signup completion request');
      
      try {
        const body = await req.json();
        console.log('🚀 Signup completion body keys:', Object.keys(body));
        
        // POST /api/v1/auth/signup according to Gnosis Pay docs - NO AUTH REQUIRED for first-time signup
        const response = await fetch('https://api.gnosispay.com/api/v1/auth/signup', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            // No Authorization header needed for first-time signup
          },
          body: JSON.stringify(body),
        })
        
        console.log('🚀 Gnosis signup completion response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🚀 Gnosis signup completion error:', errorText);
          
          return new Response(JSON.stringify({ 
            error: `Gnosis Pay signup completion error: ${response.status}`,
            details: errorText,
            status: response.status
          }), {
            status: response.status,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        }
        
        const responseData = await response.json();
        console.log('🚀 Signup completion success:', responseData);
        
        return new Response(JSON.stringify(responseData), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
        
      } catch (error) {
        console.error('🚀 Signup completion error:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to complete signup',
          details: error.message
        }), {
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
      }
    }
    
    // KYC Integration - Sumsub Iframe URL
    if (path === '/kyc/integration' && req.method === 'GET') {
      console.log('🚀 Processing KYC integration request');
      try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return new Response(JSON.stringify({ 
            error: 'Missing authentication',
            details: 'Bearer token is required'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const urlObj = new URL(req.url);
        const lang = urlObj.searchParams.get('lang') || 'en';
        const gnosisUrl = `https://api.gnosispay.com/api/v1/kyc/integration?lang=${lang}`;
        console.log('🚀 Forwarding to Gnosis Pay:', gnosisUrl);
        const response = await fetch(gnosisUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json', 'Authorization': authHeader },
        });
        const text = await response.text();
        if (!response.ok) {
          console.error('🚨 Gnosis KYC integration error', response.status, text);
          return new Response(JSON.stringify({ 
            error: `Gnosis Pay API error: ${response.status}`,
            details: text,
            status: response.status
          }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        let data;
        try { data = JSON.parse(text); } catch { data = { url: text }; }
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (error) {
        console.error('🚨 KYC integration handler error:', error);
        return new Response(JSON.stringify({ error: 'Failed to get KYC integration', details: (error as any).message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      error: 'Path not found',
      path: path,
      method: req.method,
      availablePaths: [
        '/nonce (GET)',
        '/challenge (POST)', 
        '/user (GET)',
        '/user/terms (GET, POST)',
        '/signup/otp (POST, GET)',
        '/signup (POST)',
        '/safe-config (GET)',
        '/account/deploy-safe-modules (PATCH)',
        '/account-balances (GET)',
        '/cards (GET)',
        '/cards/{id}/activate (POST)',
        '/cards/{id}/freeze (POST)',
        '/cards/{id}/unfreeze (POST)',
        '/cards/{id}/void (POST)',
        '/cards/{id}/lost (POST)',
        '/cards/{id}/stolen (POST)',
        '/cards/{id}/status (GET)',
        '/cards/virtual (POST)',
        '/cards/transactions (GET)',
        '/kyc/integration (GET)'
      ]
    }), {
      status: 404,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
    
  } catch (error) {
    console.error('🚀 General error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
  }
})

// Helper function to handle card management actions
async function handleCardAction(req: Request, jwt: string, path: string, method: string) {
  try {
    console.log(`🚀 Processing card action: ${method} ${path}`);
    
    let body = null;
    if (method !== 'GET') {
      try {
        const text = await req.text();
        if (text && text.trim()) {
          body = JSON.parse(text);
        }
      } catch (parseError) {
        console.log('🚀 No JSON body in request, continuing without body');
        // No body or invalid JSON, continue without body
      }
    }
    
    // Make request to Gnosis Pay API
    const response = await fetch(`https://api.gnosispay.com/api/v1${path}`, {
      method,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${jwt}`,
        ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    
    console.log(`🚀 Gnosis card action response status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`🚀 Gnosis card action response: ${responseText}`);
    
    if (!response.ok) {
      return new Response(JSON.stringify({ 
        error: `Card action failed: ${response.status}`,
        details: responseText,
        status: response.status
      }), {
        status: response.status,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      });
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // If response is not JSON, create a simple success response
      data = { status: 'success', message: responseText || 'Action completed successfully' };
    }
    
    return new Response(JSON.stringify(data), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
    
  } catch (error) {
    console.error('🚀 Card action error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process card action',
      details: error.message
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
  }
}

// Helper function to handle card transactions
async function handleCardTransactions(req: Request, jwt: string, url: URL) {
  try {
    console.log('🚀 Processing card transactions request');
    
    const searchParams = url.searchParams;
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    
    const response = await fetch(`https://api.gnosispay.com/api/v1/cards/transactions${queryString}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
    });
    
    console.log(`🚀 Gnosis transactions response status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`🚀 Gnosis transactions response: ${responseText.substring(0, 200)}...`);
    
    if (!response.ok) {
      return new Response(JSON.stringify({ 
        error: `Failed to fetch transactions: ${response.status}`,
        details: responseText,
        status: response.status
      }), {
        status: response.status,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      });
    }
    
    const data = JSON.parse(responseText);
    
    return new Response(JSON.stringify(data), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
    
  } catch (error) {
    console.error('🚀 Card transactions error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch card transactions',
      details: error.message
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
  }
}
