/**
 * Single source of truth for API endpoints and URLs
 * Centralizes all Supabase and external API configurations
 */

// Supabase configuration - auto-generated but centralized here
export const SUPABASE_CONFIG = {
  URL: "https://rygosxqfureajtqjgquj.supabase.co",
  ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5Z29zeHFmdXJlYWp0cWpncXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1Njk5NTEsImV4cCI6MjA3MTE0NTk1MX0.veLvmG6dC9qAsz2N86slNKrbgVuU-4ykSRPtBO_5fW8",
} as const;

// Edge function endpoints
export const EDGE_FUNCTIONS = {
  BASE_URL: `${SUPABASE_CONFIG.URL}/functions/v1`,
  ENDPOINTS: {
    GNOSIS_AUTH: '/gnosis-auth',
    GNOSIS_KYC: '/gnosis-kyc', 
    API_BRIDGE_EXECUTE: '/api-bridge-execute',
    API_BRIDGE_STATUS: '/api-bridge-status',
    API_QUOTE_SDK: '/api-quote-sdk',
    API_TOKEN_CONFIGS: '/api-token-configs',
  }
} as const;

/**
 * Build full URL for edge function endpoint
 */
export const getEdgeFunctionUrl = (endpoint: keyof typeof EDGE_FUNCTIONS.ENDPOINTS): string => {
  return `${EDGE_FUNCTIONS.BASE_URL}${EDGE_FUNCTIONS.ENDPOINTS[endpoint]}`;
};

/**
 * Build full URL for Gnosis auth endpoints (with sub-paths)
 */
export const getGnosisAuthUrl = (subPath: string = ''): string => {
  const baseUrl = getEdgeFunctionUrl('GNOSIS_AUTH');
  return subPath ? `${baseUrl}${subPath}` : baseUrl;
};

/**
 * Standard headers for Supabase API calls
 */
export const getSupabaseHeaders = (includeAuth = true) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (includeAuth) {
    headers['apikey'] = SUPABASE_CONFIG.ANON_KEY;
  }
  
  return headers;
};