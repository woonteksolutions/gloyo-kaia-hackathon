import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Wallet, Shield, Copy, Settings, LogOut, User, Globe, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { useGnosisAuth } from '@/hooks/useGnosisAuth';
import { useAppKitAccount } from '@reown/appkit/react';
import { useCDPWallet } from '@/hooks/useCDPWallet';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useToast } from '@/hooks/use-toast';
import { useLiffDappPortal } from '@/hooks/useLiffDappPortal';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  showWalletInfo?: boolean;
  showActions?: boolean;
  showProfile?: boolean;
  showLogo?: boolean;
  logoSrc?: string;
  className?: string;
  children?: React.ReactNode;
}

export function AppHeader({ 
  title, 
  subtitle, 
  showBackButton = false, 
  onBack,
  showWalletInfo = false,
  showActions = false,
  showProfile = false,
  showLogo = false,
  logoSrc = "/gloyo-uploads/gloyo-logo.png",
  className = "",
  children 
}: AppHeaderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useGnosisPay();
  const { disconnectWallet } = useGnosisAuth();
  const { isConnected, address } = useAppKitAccount();
  const { evmAddress: cdpAddress, smartAccountAddress, disconnectWallet: disconnectCDPWallet } = useCDPWallet();
  const { total: walletBalance, isLoading: balanceLoading } = useWalletBalance();
  const { isLiffLoggedIn, walletAddress: liffWalletAddress, liffLogout } = useLiffDappPortal();

  // Determine which address to show - prioritize CDP wallet, then connected wallet, then LIFF wallet
  const walletAddress = cdpAddress || address || liffWalletAddress;
  const displayName = user?.email?.split('@')[0] || "User";
  const userInitials = displayName.split(/[.@_-]/).map(n => n[0]).join('').toUpperCase().slice(0, 2) || "U";
  const hasWallet = isConnected || !!cdpAddress || isLiffLoggedIn;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Disconnect the appropriate wallet type
      if (cdpAddress) {
        await disconnectCDPWallet();
      } else if (isConnected) {
        await disconnectWallet();
      } else if (isLiffLoggedIn) {
        await liffLogout();
      }
      
      // Clear Gnosis Pay session
      logout();
      
      toast({
        title: 'Disconnected',
        description: 'Your wallet has been disconnected successfully.',
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast({
        title: 'Disconnect Failed',
        description: 'Failed to disconnect wallet. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <header className={`sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b ${className}`}>
      <div className="w-full px-4 py-4">
        <div className="flex items-center justify-between w-full">
            {/* Left Section */}
            <div className="flex items-center gap-3 flex-1">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="w-10 h-10 rounded-2xl -ml-2"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}

              {showLogo && (
                <img 
                  src={logoSrc} 
                  alt="Gloyo Logo" 
                  className="w-8 h-8 object-contain"
                />
              )}
              
              {title && (
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    {!showBackButton && !showLogo && showWalletInfo && (
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-primary-foreground" />
                      </div>
                    )}
                    <div>
                      <h1 className="text-lg md:text-xl font-semibold">{title}</h1>
                      {subtitle && (
                        <p className="text-sm text-muted-foreground">{subtitle}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {children}
              
              {/* Wallet Balance Display */}
              {hasWallet && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {balanceLoading ? (
                      <div className="w-4 h-4 border border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    ) : (
                      `$${walletBalance}`
                    )}
                  </span>
                </div>
              )}
              
              {/* Profile Dropdown */}
              {(showProfile || showActions || hasWallet) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-auto p-2 hover:bg-accent">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  
                  <DropdownMenuContent 
                    className="w-72 bg-card border shadow-lg z-[100]" 
                    align="end" 
                    forceMount
                    sideOffset={8}
                  >
                    {/* Profile Section */}
                    <div className="flex items-start gap-3 p-4">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarFallback className="text-sm bg-primary text-primary-foreground">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1 leading-none min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground">{displayName}</p>
                        {user?.email && (
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        )}
                        {hasWallet && (
                          <div className="space-y-2 mt-2">
                            {/* Debug info */}
                            {process.env.NODE_ENV === 'development' && (
                              <div className="text-xs text-muted-foreground/60 p-1 bg-muted/20 rounded">
                                Debug: EOA={!!address}, Smart={!!smartAccountAddress}, CDP={!!cdpAddress}, LIFF={!!liffWalletAddress}
                              </div>
                            )}
                            
                            {/* EOA Address */}
                            {address && (
                              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                                <Wallet className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-xs text-muted-foreground/80">EOA</span>
                                  <span className="font-mono text-xs break-all text-muted-foreground">
                                    {address.slice(0, 8)}...{address.slice(-6)}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-accent flex-shrink-0"
                                  onClick={() => copyToClipboard(address, 'EOA address')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            
                            {/* CDP Address (if different from smart account) */}
                            {cdpAddress && cdpAddress !== smartAccountAddress && (
                              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                                <Wallet className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-xs text-muted-foreground/80">CDP Wallet</span>
                                  <span className="font-mono text-xs break-all text-muted-foreground">
                                    {cdpAddress.slice(0, 8)}...{cdpAddress.slice(-6)}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-accent flex-shrink-0"
                                  onClick={() => copyToClipboard(cdpAddress, 'CDP Wallet address')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            
                            {/* Smart Account Address */}
                            {smartAccountAddress && (
                              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                                <Shield className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-xs text-muted-foreground/80">Smart Account</span>
                                  <span className="font-mono text-xs break-all text-muted-foreground">
                                    {smartAccountAddress.slice(0, 8)}...{smartAccountAddress.slice(-6)}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-accent flex-shrink-0"
                                  onClick={() => copyToClipboard(smartAccountAddress, 'Smart Account address')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            
                            {/* LINE Wallet Address */}
                            {liffWalletAddress && (
                              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                                <Wallet className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-xs text-muted-foreground/80">LINE Wallet</span>
                                  <span className="font-mono text-xs break-all text-muted-foreground">
                                    {liffWalletAddress.slice(0, 8)}...{liffWalletAddress.slice(-6)}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-accent flex-shrink-0"
                                  onClick={() => copyToClipboard(liffWalletAddress, 'LINE Wallet address')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            
                            {/* Gnosis Safe Address */}
                            {user?.safeAddress && (
                              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                                <Shield className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-xs text-muted-foreground/80">Gnosis Safe</span>
                                  <span className="font-mono text-xs break-all text-muted-foreground">
                                    {user.safeAddress.slice(0, 8)}...{user.safeAddress.slice(-6)}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-accent flex-shrink-0"
                                  onClick={() => copyToClipboard(user.safeAddress, 'Gnosis Safe address')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenuSeparator />
                    
                    {/* Language Selection */}
                    <DropdownMenuItem className="cursor-pointer">
                      <Globe className="mr-3 h-4 w-4" />
                      <span>Language</span>
                      <span className="ml-auto text-xs text-muted-foreground">EN</span>
                    </DropdownMenuItem>
                    
                    {/* Settings */}
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-3 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    {/* Sign Out */}
                    {hasWallet && (
                      <DropdownMenuItem 
                        onClick={handleDisconnect} 
                        className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        <span>Sign out</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
    </header>
  );
}