import { setAccessToken } from "./token";

// Map whatever the server returns (e.g., { jwt } or { access_token })
// to { accessToken } and store it.
export function storeAuthFromResponse(resp: unknown) {
  const anyResp = resp as Record<string, unknown>;

  let accessToken: string | null = null;
  let sourceField: string | null = null;
  for (const key of ['accessToken', 'token', 'jwt', 'access_token'] as const) {
    const val = anyResp[key] as string | undefined;
    if (typeof val === 'string' && val.length > 0) {
      accessToken = val;
      sourceField = key;
      break;
    }
  }

  if (!accessToken) {
    console.error('storeAuthFromResponse: Missing token field. Response keys:', Object.keys(anyResp));
    throw new Error("Auth response missing token");
  }

  console.log(`storeAuthFromResponse: using token from "${sourceField}" (${accessToken.slice(0, 12)}...)`);
  setAccessToken(accessToken);
  return accessToken;
}