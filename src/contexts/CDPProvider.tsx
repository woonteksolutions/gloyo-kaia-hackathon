import { ReactNode } from 'react';
import { CDPHooksProvider } from '@coinbase/cdp-hooks';
import type { Config } from '@coinbase/cdp-core';

interface CDPProviderProps {
  children: ReactNode;
}

export function CDPProvider({ children }: CDPProviderProps) {
  const config: Config = {
    projectId: '70ab7963-45fa-4bae-a8bc-f65af20964a4',
    // Automatically create Smart Accounts for new users (includes EOA + Smart Account)
    createAccountOnLogin: 'evm-smart',
    debugging: true,
  };

  console.log('🔍 CDP Provider initialized with config:', {
    projectId: config.projectId,
    createAccountOnLogin: config.createAccountOnLogin,
    debugging: config.debugging,
    paymasterEnabled: 'Smart accounts with paymaster support enabled'
  });

  return (
    <CDPHooksProvider config={config}>
      {children}
    </CDPHooksProvider>
  );
}