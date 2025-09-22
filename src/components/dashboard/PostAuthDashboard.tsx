import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  TrendingUp, 
  Plus, 
  History, 
  MoreVertical, 
  Eye, 
  Copy, 
  Lock, 
  Shield, 
  Trash2,
  AlertTriangle,
  Unlock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { PaymentCard } from '@/components/PaymentCard';
import { OrderNewCardBanner } from '@/components/OrderNewCardBanner';
import { CardCarousel } from '@/components/CardCarousel';
import { GnosisApiService } from '@/services/gnosisApiService';
import { CardDetailsResponse } from '@/types/gnosis-api';
import USDTStakePool from '@/components/stake/USDTStakePool';
import { useKaiaStaking } from '@/hooks/useKaiaStaking';

export function PostAuthDashboard() {
  const [currentTab, setCurrentTab] = useState<'card' | 'earn'>('card');
  const [showCardMore, setShowCardMore] = useState(false);
  const [allCards, setAllCards] = useState<any[]>([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, navigateToStep } = useGnosisPay();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userBalance, stakedAmount, isLoading: stakingLoading, stake, unstake } = useKaiaStaking();

  const handleEarnClick = () => {
    setCurrentTab('earn');
  };

  const handleCardClick = () => {
    setCurrentTab('card');
  };

  // Load card data and transactions on mount  
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted) {
        await loadCardData();
        await loadTransactions();
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array to run only once

  const loadCardData = async () => {
    try {
      setIsLoading(true);
      console.log('🚀 Loading card data...');
      const cards = await GnosisApiService.getUserCards();
      console.log('🚀 Received cards:', cards);
      
      if (cards.length > 0) {
        // Transform all cards and get their detailed status
        const transformedCards = await Promise.all(
          cards.map(async (card) => {
            try {
              console.log('🚀 Getting status for card:', card.id);
              const cardStatus = await GnosisApiService.getCardStatus(card.id);
              console.log('🚀 Card status for', card.id, ':', cardStatus);
              
              return {
                id: card.id,
                cardToken: card.cardToken,
                cardNumber: `•••• •••• •••• ${card.lastFourDigits}`,
                expiryDate: '--/--', // Not provided by list endpoint
                balance: 0, // Will need separate balance endpoint  
                status: card.statusName || 'UNKNOWN',
                statusCode: card.statusCode,
                cardBrand: card.virtual ? 'GNOSIS' : 'GNOSIS',
                type: card.virtual ? 'VIRTUAL' : 'PHYSICAL',
                lastFourDigits: card.lastFourDigits,
                virtual: card.virtual,
                isFrozen: cardStatus.isFrozen || false,
                isStolen: cardStatus.isStolen || false,
                isLost: cardStatus.isLost || false,
                isBlocked: cardStatus.isBlocked || false,
                isVoid: cardStatus.isVoid || false,
                activatedAt: card.activatedAt || cardStatus.activatedAt,
                canFreeze: card.statusName?.toLowerCase() === 'active' && !cardStatus.isFrozen,
                canUnfreeze: cardStatus.isFrozen, // Allow unfreezing any frozen card
                isDeclined: card.statusName === 'Declined'
              };
            } catch (statusError) {
              console.error('Failed to get card status for card:', card.id, statusError);
              // Return card with basic info if status fetch fails
              return {
                id: card.id,
                cardToken: card.cardToken,
                cardNumber: `•••• •••• •••• ${card.lastFourDigits}`,
                expiryDate: '--/--',
                balance: 0,
                status: card.statusName || 'UNKNOWN',
                statusCode: card.statusCode,
                cardBrand: 'GNOSIS',
                type: card.virtual ? 'VIRTUAL' : 'PHYSICAL',
                lastFourDigits: card.lastFourDigits,
                virtual: card.virtual,
                isFrozen: false,
                isStolen: false,
                isLost: false,
                isBlocked: false,
                isVoid: false,
                activatedAt: card.activatedAt,
                canFreeze: false,
                canUnfreeze: false,
                isDeclined: false
              };
            }
          })
        );
        
        // Filter to only show manageable cards (active, inactive, frozen)
        const manageableCards = transformedCards.filter(card => {
          const state = getCardState(card);
          return ['active', 'inactive', 'frozen'].includes(state);
        });
        
        console.log('🚀 Transformed cards:', transformedCards);
        console.log('🚀 Manageable cards (filtered):', manageableCards);
        setAllCards(manageableCards);
        // Reset selected index if it's out of bounds
        if (selectedCardIndex >= manageableCards.length) {
          setSelectedCardIndex(0);
        }
      } else {
        console.log('🚀 No cards found');
        setAllCards([]);
      }
    } catch (error) {
      console.error('Failed to load card data:', error);
      setAllCards([]);
      toast({
        title: "Error",
        description: "Failed to load card information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await GnosisApiService.getCardTransactions(1, 10);
      setTransactions(response.results || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      // Set empty array on error to show "No recent transactions" message
      setTransactions([]);
    }
  };

  const handleOrderCard = () => {
    navigateToStep('card-order');
  };

  const handleFreezeCard = async () => {
    const currentCard = allCards[selectedCardIndex];
    if (!currentCard) return;
    
    // Check if card can be frozen/unfrozen
    // Allow unfreezing of declined cards if they're frozen
    if (currentCard.isDeclined && !currentCard.isFrozen) {
      toast({
        title: "Action Not Available",
        description: "This declined card can only be unfrozen, not frozen",
        variant: "destructive"
      });
      return;
    }
    
    if (!currentCard.canFreeze && !currentCard.canUnfreeze) {
      toast({
        title: "Action Not Available",
        description: "Card status does not allow freeze/unfreeze operations",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      if (currentCard.isFrozen && currentCard.canUnfreeze) {
        await GnosisApiService.unfreezeCard(currentCard.id);
        toast({
          title: "Card Unfrozen",
          description: "Your card has been unfrozen successfully",
        });
      } else if (!currentCard.isFrozen && currentCard.canFreeze) {
        await GnosisApiService.freezeCard(currentCard.id);
        toast({
          title: "Card Frozen",
          description: "Your card has been frozen successfully",
        });
      }
      await loadCardData(); // Refresh card data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update card status",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardAction = async (action: 'void' | 'report-lost' | 'report-stolen') => {
    const currentCard = allCards[selectedCardIndex];
    if (!currentCard) return;
    
    try {
      setIsLoading(true);
      let result;
      let message = '';
      
      switch (action) {
        case 'void':
          result = await GnosisApiService.voidCard(currentCard.id);
          message = 'Virtual card voided successfully';
          break;
        case 'report-lost':
          result = await GnosisApiService.reportCardLost(currentCard.id);
          message = 'Card reported as lost successfully';
          break;
        case 'report-stolen':
          result = await GnosisApiService.reportCardStolen(currentCard.id);
          message = 'Card reported as stolen successfully';
          break;
      }
      
      toast({
        title: "Success",
        description: message,
      });
      
      await loadCardData(); // Refresh card data
      setShowCardMore(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform card action",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowCardDetails = () => {
    toast({
      title: "Card Details",
      description: "Card details revealed",
    });
  };

  const handleTopUp = () => {
    navigate('/topup');
  };

  const copyToClipboard = (text: string, description: string) => {
    // Remove bullet points from card number for copying
    const cleanText = text.replace(/[•\s]/g, '');
    navigator.clipboard.writeText(cleanText);
    toast({
      title: "Copied!",
      description: `${description} copied to clipboard`,
    });
  };

  // Helper function to get card state
  const getCardState = (card: any) => {
    if (card.isFrozen) return 'frozen';
    if (!card.activatedAt) return 'inactive';
    if (card.statusCode === 1000) return 'active';
    if ([1005, 1007].includes(card.statusCode)) return 'declined';
    if ([1009, 1199].includes(card.statusCode)) return 'void';
    if (card.statusCode === 1041) return 'lost';
    if (card.statusCode === 1043) return 'stolen';
    if ([1054, 1154].includes(card.statusCode)) return 'expired';
    if (card.statusCode === 1062) return 'restricted';
    return 'unknown';
  };

  const handleCardSelect = (index: number) => {
    console.log('🚀 Card selected:', index, 'out of', allCards.length);
    setSelectedCardIndex(index);
  };

  // Card management functions
  const handleActivateCard = async () => {
    const currentCard = allCards[selectedCardIndex];
    if (!currentCard) return;

    try {
      setIsLoading(true);
      await GnosisApiService.activateCard(currentCard.id);
      toast({
        title: "Card Activated",
        description: "Your card is now active and ready to use",
      });
      await loadCardData(); // Refresh card data
    } catch (error) {
      console.error('Failed to activate card:', error);
      toast({
        title: "Activation Failed",
        description: "Failed to activate the card. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (currentTab === 'earn') {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader 
          title="Earn"
          subtitle="Stake your assets and earn rewards"
          showLogo
        />
        
      {/* Content */}
      <div className="mobile-container mobile-content pb-24 space-y-6">
        {/* USDT Staking Pool */}
        <USDTStakePool
          userBalance={userBalance}
          stakedAmount={stakedAmount}
          onStake={stake}
          onUnstake={unstake}
        />
        
        {/* Additional Pools (Future) */}
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8 text-center">
              <div>
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">More staking pools coming soon</p>
                <p className="text-sm text-muted-foreground mt-2">ETH, BTC, and more assets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        
        {/* Bottom Navigation */}
        <BottomNavigation 
          currentTab="earn" 
          onCardClick={handleCardClick}
          onEarnClick={handleEarnClick}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        title="Card"
        subtitle="Manage your stablecoin card"
        showLogo
        showWalletInfo={true}
        showProfile={true}
      />
      
        {/* Main Content */}
        <div className="mobile-container mobile-content pb-24 space-y-6">
        
        {/* Card Display */}
        {isLoading ? (
          <div className="animate-pulse bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 rounded-2xl p-6 h-48">
            <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
            <div className="h-8 bg-white/20 rounded w-1/2 mb-8"></div>
            <div className="h-6 bg-white/20 rounded w-2/3"></div>
          </div>
        ) : allCards.length === 0 ? (
          /* Show order card banner when no card is available */
          <OrderNewCardBanner onOrderCard={handleOrderCard} />
        ) : (
          <>
            {/* Card Carousel */}
            <CardCarousel 
              key={`carousel-${allCards.length}`}
              cards={allCards}
              selectedCardIndex={selectedCardIndex}
              onCardSelect={handleCardSelect}
            />

            {/* Card Management Actions - Single Row Layout */}
            <div className="flex justify-center gap-8 px-4">
              {/* Freeze/Unfreeze Action (for active and frozen cards) */}
              {allCards[selectedCardIndex] && ['active', 'frozen'].includes(getCardState(allCards[selectedCardIndex])) && (
                <div className="flex flex-col items-center">
                  <button 
                    onClick={handleFreezeCard}
                    disabled={isLoading}
                    className={`w-12 h-12 ${
                      allCards[selectedCardIndex]?.isFrozen ? 'bg-amber-100' : 'bg-blue-100'
                    } rounded-full flex items-center justify-center mb-2 transition-colors hover:opacity-80`}
                  >
                    {allCards[selectedCardIndex]?.isFrozen ? (
                      <Unlock className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Lock className="w-5 h-5 text-blue-600" />
                    )}
                  </button>
                  <span className="text-xs text-center text-muted-foreground">
                    {allCards[selectedCardIndex]?.isFrozen ? 'Unfreeze' : 'Freeze'}
                  </span>
                </div>
              )}

              {/* Activate Action (for inactive cards) */}
              {allCards[selectedCardIndex] && getCardState(allCards[selectedCardIndex]) === 'inactive' && (
                <div className="flex flex-col items-center">
                  <button 
                    onClick={handleActivateCard}
                    disabled={isLoading}
                    className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2 transition-colors hover:opacity-80"
                  >
                    <Unlock className="w-5 h-5 text-green-600" />
                  </button>
                  <span className="text-xs text-center text-muted-foreground">Activate</span>
                </div>
              )}
              
              <div className="flex flex-col items-center">
                <button 
                  onClick={handleTopUp}
                  className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2 hover:opacity-80 transition-colors"
                >
                  <Plus className="w-5 h-5 text-green-600" />
                </button>
                <span className="text-xs text-center text-muted-foreground">Top Up</span>
              </div>
              
              <div className="flex flex-col items-center">
                <button 
                  onClick={handleShowCardDetails}
                  className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2 hover:opacity-80 transition-colors"
                >
                  <Eye className="w-5 h-5 text-purple-600" />
                </button>
                <span className="text-xs text-center text-muted-foreground">Details</span>
              </div>

              <div className="flex flex-col items-center">
                <button 
                  onClick={() => setShowCardMore(true)}
                  disabled={!allCards[selectedCardIndex]}
                  className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2 hover:opacity-80 transition-colors disabled:opacity-50"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-xs text-center text-muted-foreground">More</span>
              </div>
            </div>
          </>
        )}

        {/* Recent Transactions - Only show when card exists */}
        {allCards.length > 0 && (
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-muted-foreground">Transaction</h3>
                <h3 className="font-medium text-muted-foreground">Amount</h3>
              </div>
              
              <div className="space-y-4">
                {transactions.length > 0 ? (
                  transactions.map((transaction, index) => {
                    const rawAmount = parseFloat(transaction.billingAmount || '0');
                    const isDebit = rawAmount < 0;
                    const amount = Math.abs(rawAmount);
                    const formattedAmount = `${transaction.billingCurrency?.symbol || '$'}${amount.toFixed(2)}`;
                    const date = transaction.createdAt ? new Date(transaction.createdAt) : new Date();
                    const isValidDate = !isNaN(date.getTime());
                    const formattedDate = isValidDate ? date.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                    }) : 'Unknown date';
                    const formattedTime = isValidDate ? date.toLocaleTimeString('en-US', { 
                      hour12: false, 
                      hour: '2-digit', 
                      minute: '2-digit'
                    }) : 'Unknown time';

                    return (
                      <div key={transaction.id || index} className="flex items-center justify-between py-2 border-b border-muted/50 last:border-0">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isDebit ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {isDebit ? '↓' : '↑'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {transaction.merchant?.name || 'Transaction'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formattedDate} {formattedTime}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            isDebit ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {isDebit ? '-' : '+'}{formattedAmount}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {transaction.status || 'completed'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recent transactions</p>
                  </div>
                )}
              </div>

              <Button 
                variant="ghost" 
                className="w-full mt-4 text-primary hover:text-primary-foreground hover:bg-primary"
              >
                See all
              </Button>
            </div>
          </Card>
        )}

      </div>
      
      {/* Card More Actions Dialog */}
      <Dialog open={showCardMore} onOpenChange={setShowCardMore}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Card Actions</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {allCards[selectedCardIndex] && (
              <>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => copyToClipboard(allCards[selectedCardIndex].cardNumber, 'Card number')}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Card Number
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => copyToClipboard(allCards[selectedCardIndex].cardToken, 'Card token')}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Card Token
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={handleOrderCard}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Order New Card
                </Button>

                {allCards[selectedCardIndex].type === 'VIRTUAL' && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-orange-600 hover:text-orange-700" 
                    onClick={() => handleCardAction('void')}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Void Virtual Card
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  className="w-full justify-start text-red-600 hover:text-red-700" 
                  onClick={() => handleCardAction('report-lost')}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Report as Lost
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start text-red-600 hover:text-red-700" 
                  onClick={() => handleCardAction('report-stolen')}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Report as Stolen
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Bottom Navigation */}
      <BottomNavigation 
        currentTab="card" 
        onCardClick={handleCardClick}
        onEarnClick={handleEarnClick}
      />
    </div>
  );
}