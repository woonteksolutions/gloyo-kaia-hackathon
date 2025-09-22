import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle } from 'lucide-react';
import { getTokenConfig, TokenConfig } from '@/services/rhinoService';
import { useToast } from '@/hooks/use-toast';
import { getTokenName } from '@/config/token-defaults';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { getTokenLogo, hasTokenLogo } from '@/lib/logoUtils';

interface SelectTokenProps {
  title: string;
  selectedToken?: string;
  onSelect: (token: string) => void;
  disabled?: boolean;
  excludeChain?: string;
  filterTokens?: string[];
}

interface TokenInfo {
  symbol: string;
  name: string;
  chains: string[];
  supported: boolean;
}

export default function SelectToken({ 
  title, 
  selectedToken, 
  onSelect, 
  disabled = false,
  excludeChain,
  filterTokens
}: SelectTokenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      setLoading(true);
      // Load token configuration - no fallbacks
      const config: TokenConfig = await getTokenConfig('all');

      // Build token list from config
      const tokenChains = config.tokens;
      const unsupportedTokens = config.unsupported?.tokens;

      // Get all unique tokens
      const allTokens = new Set<string>();
      Object.values(tokenChains).forEach(chainTokens => {
        chainTokens.forEach(token => allTokens.add(token));
      });

      // Build token info list
      const tokenList: TokenInfo[] = [];
      allTokens.forEach(token => {
        // Filter tokens if specified
        if (filterTokens && !filterTokens.includes(token)) {
          return;
        }

        const chains = Object.entries(tokenChains)
          .filter(([_, tokens]) => tokens.includes(token))
          .map(([chain, _]) => chain);

        tokenList.push({
          symbol: token,
          name: getTokenName(token),
          chains: excludeChain ? chains.filter(c => c !== excludeChain) : chains,
          supported: !unsupportedTokens.includes(token)
        });
      });

      // Sort by supported first, then alphabetically
      tokenList.sort((a, b) => {
        if (a.supported !== b.supported) {
          return b.supported ? 1 : -1;
        }
        return a.symbol.localeCompare(b.symbol);
      });

      setTokens(tokenList);
    } catch (error) {
      console.error('Failed to load tokens:', error);
      toast({
        title: "Error",
        description: "Failed to load token list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTokens = tokens.filter(token =>
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTokenSelect = (token: TokenInfo) => {
    if (!token.supported) {
      toast({
        title: "Unsupported Token",
        description: `${token.symbol} is not currently supported for bridging`,
        variant: "destructive",
      });
      return;
    }

    if (token.chains.length === 0) {
      toast({
        title: "No Available Networks",
        description: `${token.symbol} is not available on any supported networks`,
        variant: "destructive",
      });
      return;
    }

    onSelect(token.symbol);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Token List */}
      <div className="flex-1 overflow-y-auto">
        {filteredTokens.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No tokens found</p>
          </div>
        ) : (
          <div className="p-2">
            {filteredTokens.map((token) => (
              <Button
                key={token.symbol}
                variant={selectedToken === token.symbol ? "secondary" : "ghost"}
                className="w-full justify-start p-4 h-auto mb-2"
                onClick={() => handleTokenSelect(token)}
                disabled={disabled || !token.supported}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {hasTokenLogo(token.symbol) ? (
                      <img 
                        src={getTokenLogo(token.symbol)} 
                        alt={token.symbol}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium">{token.symbol.charAt(0)}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{token.symbol}</span>
                      {selectedToken === token.symbol && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                      {!token.supported && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Unsupported</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{token.name}</p>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}