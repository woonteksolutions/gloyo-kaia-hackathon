import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { getTokenConfig, TokenConfig } from '@/services/rhinoService';
import { useToast } from '@/hooks/use-toast';
import { useAppKitNetwork } from '@reown/appkit/react';
import { networkMap, getChainIcon } from '@/lib/chainUtils';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { getChainLogo, hasChainLogo } from '@/lib/logoUtils';

interface SelectNetworkProps {
  title: string;
  selectedChain?: string;
  selectedToken?: string;
  onSelect: (chain: string) => void;
  disabled?: boolean;
  autoSwitchWallet?: boolean;
  filterChains?: string[];
}

interface ChainInfo {
  id: string;
  name: string;
  displayName: string;
  supported: boolean;
  hasToken: boolean;
  warning?: string;
}

export default function SelectNetwork({ 
  title, 
  selectedChain, 
  selectedToken,
  onSelect, 
  disabled = false,
  autoSwitchWallet = false,
  filterChains
}: SelectNetworkProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [chains, setChains] = useState<ChainInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { switchNetwork } = useAppKitNetwork();

  useEffect(() => {
    loadChains();
  }, [selectedToken]);

  const loadChains = async () => {
    try {
      setLoading(true);
      // Load token configuration - no fallbacks
      const config: TokenConfig = await getTokenConfig('all');
      
      const configChains = config.chains;
      const tokenChains = config.tokens;
      const unsupportedChains = config.unsupported?.chains;
      const sameChainSwaps = config.unsupported?.sameChainSwaps;

      // Build chain list with explicit token support
      const chainList: ChainInfo[] = configChains
        .filter(chain => {
          // Apply chain filter if provided (for Kaia-only mode)
          if (filterChains && filterChains.length > 0) {
            return filterChains.includes(chain.id);
          }
          return true;
        })
        .map(chain => {
          const hasToken = selectedToken ? 
            (tokenChains[chain.id] && tokenChains[chain.id].includes(selectedToken)) : 
            true;

          let warning: string | undefined;
          
          // Check for same-chain swap restrictions
          if (selectedToken && sameChainSwaps[chain.id]?.includes(selectedToken)) {
            warning = 'Same-chain swaps not supported';
          }

          return {
            id: chain.id,
            name: chain.name,
            displayName: chain.displayName,
            supported: !unsupportedChains.includes(chain.id),
            hasToken,
            warning
          };
        });

      // Sort by: has token, supported, then alphabetically
      chainList.sort((a, b) => {
        if (a.hasToken !== b.hasToken) return b.hasToken ? 1 : -1;
        if (a.supported !== b.supported) return b.supported ? 1 : -1;
        return a.displayName.localeCompare(b.displayName);
      });

      setChains(chainList);
    } catch (error) {
      console.error('Failed to load chains:', error);
      toast({
        title: "Error",
        description: "Failed to load network list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredChains = chains.filter(chain =>
    chain.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chain.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

const handleChainSelect = async (chain: ChainInfo) => {
  if (!chain.supported) {
    toast({
      title: "Unsupported Network",
      description: `${chain.displayName} is not currently supported`,
      variant: "destructive",
    });
    return;
  }

  if (!chain.hasToken && selectedToken) {
    toast({
      title: "Token Not Available",
      description: `${selectedToken} is not available on ${chain.displayName}`,
      variant: "destructive",
    });
    return;
  }

  if (chain.warning) {
    toast({
      title: "Network Limitation",
      description: chain.warning,
      variant: "destructive",
    });
    return;
  }

  // Auto switch wallet to the selected source network when enabled
  if (autoSwitchWallet && switchNetwork) {
    const target = networkMap[chain.id];
    if (target) {
      try {
        await switchNetwork(target);
        await new Promise((r) => setTimeout(r, 800));
      } catch (e) {
        console.error('Wallet network switch failed:', e);
      }
    }
  }

  onSelect(chain.id);
};

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search networks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Chain List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChains.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No networks found</p>
          </div>
        ) : (
          <div className="p-2">
            {filteredChains.map((chain) => (
              <Button
                key={chain.id}
                variant={selectedChain === chain.id ? "secondary" : "ghost"}
                className="w-full justify-start p-4 h-auto mb-2"
                onClick={() => handleChainSelect(chain)}
                disabled={disabled || !chain.supported || (!chain.hasToken && !!selectedToken)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {hasChainLogo(chain.id) ? (
                      <img 
                        src={getChainLogo(chain.id)} 
                        alt={chain.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm">{getChainIcon(chain.id)}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{chain.displayName}</span>
                      {selectedChain === chain.id && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                      {!chain.supported && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Unsupported</span>
                      )}
                      {!chain.hasToken && selectedToken && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">
                          No {selectedToken}
                        </span>
                      )}
                      {chain.warning && (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                    {selectedToken && chain.hasToken && (
                      <p className="text-sm text-muted-foreground">
                        {selectedToken} available
                      </p>
                    )}
                    {chain.warning && (
                      <p className="text-xs text-orange-600">{chain.warning}</p>
                    )}
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