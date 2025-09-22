import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  EyeOff, 
  Copy, 
  Settings, 
  CreditCard, 
  Shield, 
  Trash2, 
  MoreVertical,
  Lock,
  Unlock,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';

interface PaymentCardProps {
  id: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  holderName: string;
  type: 'VIRTUAL' | 'PHYSICAL';
  status: 'PENDING' | 'ACTIVE' | 'BLOCKED' | 'FROZEN';
  balance?: number; // Make optional since we'll use shared balance
  currency: string;
  cardBrand?: 'VISA' | 'MASTERCARD' | 'GNOSIS';
  onCardUpdate?: () => void;
  sharedBalance?: number; // New prop for shared balance
}

export function PaymentCard({
  id,
  cardNumber,
  expiryDate,
  cvv,
  holderName,
  type,
  status,
  balance,
  currency,
  cardBrand = 'GNOSIS',
  onCardUpdate,
  sharedBalance
}: PaymentCardProps) {
  // Use shared balance if provided, otherwise fall back to individual balance
  const displayBalance = sharedBalance !== undefined ? sharedBalance : (balance || 0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-success text-success-foreground';
      case 'PENDING': return 'bg-warning text-warning-foreground';
      case 'BLOCKED': return 'bg-destructive text-destructive-foreground';
      case 'FROZEN': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCardGradient = () => {
    switch (cardBrand) {
      case 'VISA':
        return 'from-blue-600 via-blue-700 to-blue-800';
      case 'MASTERCARD':
        return 'from-red-600 via-red-700 to-red-800';
      default:
        return 'from-primary via-primary-dark to-primary';
    }
  };

  const maskCardNumber = (number: string) => {
    if (!isRevealed) {
      return `•••• •••• •••• ${number.slice(-4)}`;
    }
    return number.replace(/(.{4})/g, '$1 ').trim();
  };

  const maskCvv = (cvv: string) => {
    return isRevealed ? cvv : '•••';
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Unable to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const toggleReveal = () => {
    setIsRevealed(!isRevealed);
    toast({
      title: isRevealed ? 'Card Details Hidden' : 'Card Details Revealed',
      description: isRevealed ? 'Your card information is now hidden' : 'Your card details are now visible',
    });
  };

  const handleCardAction = async (action: 'freeze' | 'unfreeze' | 'void' | 'report-lost' | 'report-stolen') => {
    setIsLoading(true);
    console.log(`🔍 PaymentCard: Starting ${action} for card ${id}`);
    
    try {
      let endpoint = '';
      let actionText = '';
      
      switch (action) {
        case 'freeze':
          endpoint = `/cards/${id}/freeze`;
          actionText = 'frozen';
          break;
        case 'unfreeze':
          endpoint = `/cards/${id}/unfreeze`;
          actionText = 'unfrozen';
          break;
        case 'void':
          endpoint = `/cards/${id}/void`;
          actionText = 'voided';
          break;
        case 'report-lost':
          endpoint = `/cards/${id}/lost`;
          actionText = 'reported as lost';
          break;
        case 'report-stolen':
          endpoint = `/cards/${id}/stolen`;
          actionText = 'reported as stolen';
          break;
      }

      console.log(`🔍 PaymentCard: Making API call to ${endpoint}`);
      const result = await apiFetch(endpoint, { method: 'POST' });
      console.log(`🔍 PaymentCard: API response:`, result);
      
      toast({
        title: 'Success',
        description: `Card has been ${actionText} successfully`,
      });
      
      // Refresh card data
      onCardUpdate?.();
    } catch (error) {
      console.error(`🔍 PaymentCard: ${action} failed:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action.replace('-', ' ')} card: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Card Visual */}
      <div className="relative">
        <Card className="overflow-hidden border-0 shadow-mobile-elevated">
          <div className={`relative h-56 bg-gradient-to-br ${getCardGradient()} p-6 text-white`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4 w-32 h-32 rounded-full border-2 border-white/20" />
              <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full border-2 border-white/20" />
            </div>
            
            {/* Card Content */}
            <div className="relative z-10 h-full flex flex-col justify-between">
              {/* Top Section */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium opacity-90">{type}</span>
                </div>
                <Badge className={getStatusColor(status)} variant="secondary">
                  {status}
                </Badge>
              </div>

              {/* Chip */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-9 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-md flex items-center justify-center">
                  <div className="w-8 h-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-sm" />
                </div>
                <div className="text-xs opacity-75">
                  {cardBrand === 'GNOSIS' ? 'DEBIT' : cardBrand}
                </div>
              </div>

              {/* Card Number */}
              <div className="space-y-2">
                <div 
                  className="font-mono text-base font-bold tracking-wide cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors break-all"
                  onClick={() => isRevealed && handleCopy(cardNumber, 'Card number')}
                >
                  {maskCardNumber(cardNumber)}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <div className="text-xs opacity-70">CARD HOLDER</div>
                    <div className="font-medium">{holderName.toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70">EXPIRES</div>
                    <div className="font-medium">{expiryDate}</div>
                  </div>
                  <div 
                    className="cursor-pointer hover:bg-white/10 p-1 rounded"
                    onClick={() => isRevealed && handleCopy(cvv, 'CVV')}
                  >
                    <div className="text-xs opacity-70">CVV</div>
                    <div className="font-mono font-bold">{maskCvv(cvv)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Card Controls */}
      <div className="space-y-3">
        {/* Balance Display */}
        <Card className="mobile-card">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold">
                  {displayBalance.toFixed(2)} {currency}
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 rounded-xl font-medium border-2 flex items-center gap-2"
            onClick={() => window.location.href = '/topup'}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4" />
            Top Up
          </Button>
          
          <Button
            variant="outline"
            className="h-12 rounded-xl font-medium border-2 flex items-center gap-2"
            onClick={() => {
              if (status === 'ACTIVE') {
                handleCardAction('freeze');
              } else if (status === 'FROZEN') {
                handleCardAction('unfreeze');
              }
            }}
            disabled={isLoading || status === 'PENDING' || status === 'BLOCKED'}
          >
            {status === 'FROZEN' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {status === 'FROZEN' ? 'Unfreeze' : 'Freeze'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Button
            variant="outline"
            className="h-12 rounded-xl font-medium border-2 flex items-center gap-2"
            onClick={toggleReveal}
            disabled={isLoading}
          >
            {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isRevealed ? 'Hide Details' : 'Reveal Details'}
          </Button>
        </div>

        {/* Management Actions */}
        <div className="space-y-3">
          {/* Security Actions for Physical Cards */}
          {type === 'PHYSICAL' && status !== 'BLOCKED' && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50"
                onClick={() => handleCardAction('report-lost')}
                disabled={isLoading}
              >
                <Shield className="w-4 h-4 mr-2" />
                Report Lost
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => handleCardAction('report-stolen')}
                disabled={isLoading}
              >
                <Shield className="w-4 h-4 mr-2" />
                Report Stolen
              </Button>
            </div>
          )}

          {/* Void Action for Virtual Cards */}
          {type === 'VIRTUAL' && status !== 'BLOCKED' && (
            <div className="pt-2 border-t">
              <Button
                variant="destructive"
                size="sm"
                className="w-full h-10 rounded-xl"
                onClick={() => handleCardAction('void')}
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Void Virtual Card
              </Button>
            </div>
          )}
        </div>

        {/* Revealed Actions */}
        {isRevealed && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 rounded-xl justify-start"
              onClick={() => handleCopy(cardNumber, 'Card number')}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Number
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 rounded-xl justify-start"
              onClick={() => handleCopy(cvv, 'CVV')}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy CVV
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}