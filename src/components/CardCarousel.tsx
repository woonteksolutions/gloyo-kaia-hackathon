import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardData {
  id: string;
  cardToken: string;
  cardNumber: string;
  expiryDate: string;
  balance: number;
  status: string;
  statusCode: number;
  cardBrand: string;
  type: 'VIRTUAL' | 'PHYSICAL';
  isFrozen: boolean;
  isStolen: boolean;
  isLost: boolean;
  isBlocked: boolean;
  isVoid: boolean;
  activatedAt: string | null;
  lastFourDigits: string;
  virtual: boolean;
}

interface CardCarouselProps {
  cards: CardData[];
  selectedCardIndex: number;
  onCardSelect: (index: number) => void;
  className?: string;
}

export function CardCarousel({ cards, selectedCardIndex, onCardSelect, className }: CardCarouselProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);

  // Debug log
  console.log('🚀 CardCarousel render:', {
    cardsCount: cards.length,
    selectedCardIndex,
    cards: cards.map(c => ({ id: c.id, statusCode: c.statusCode, status: c.status }))
  });

  // Map status codes to user-friendly states
  const getCardState = (card: CardData) => {
    // Log for debugging
    console.log('🚀 Getting card state for card:', card.id, {
      isFrozen: card.isFrozen,
      activatedAt: card.activatedAt,
      statusCode: card.statusCode,
      statusName: card.status
    });
    
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

  const getStateVariant = (state: string) => {
    switch (state) {
      case 'active': return 'success';
      case 'frozen': return 'warning';
      case 'inactive': return 'pending';
      case 'declined':
      case 'void':
      case 'lost':
      case 'stolen':
      case 'expired':
        return 'error';
      default: return 'default';
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'active': return 'Active';
      case 'frozen': return 'Frozen';
      case 'inactive': return 'Inactive';
      case 'declined': return 'Declined';
      case 'void': return 'Void';
      case 'lost': return 'Lost';
      case 'stolen': return 'Stolen';
      case 'expired': return 'Expired';
      case 'restricted': return 'Restricted';
      default: return 'Unknown';
    }
  };

  const getCardGradient = (cardBrand: string, state: string) => {
    if (state === 'frozen') {
      return 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600';
    }
    if (['declined', 'void', 'lost', 'stolen', 'expired'].includes(state)) {
      return 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600';
    }
    if (state === 'inactive') {
      return 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500';
    }
    
    // Active cards get brand colors
    switch (cardBrand) {
      case 'MASTERCARD':
        return 'bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500';
      case 'VISA':
        return 'bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700';
      default:
        return 'bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setCurrentX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCurrentX(e.clientX);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    const diff = currentX - startX;
    const threshold = 50;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && selectedCardIndex > 0) {
        onCardSelect(selectedCardIndex - 1);
      } else if (diff < 0 && selectedCardIndex < cards.length - 1) {
        onCardSelect(selectedCardIndex + 1);
      }
    }
    
    setIsDragging(false);
    setStartX(0);
    setCurrentX(0);
  };

  // Touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const diff = currentX - startX;
    const threshold = 50;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && selectedCardIndex > 0) {
        onCardSelect(selectedCardIndex - 1);
      } else if (diff < 0 && selectedCardIndex < cards.length - 1) {
        onCardSelect(selectedCardIndex + 1);
      }
    }
    
    setIsDragging(false);
    setStartX(0);
    setCurrentX(0);
  };

  if (cards.length === 0) {
    return null;
  }

  const selectedCard = cards[selectedCardIndex];
  const cardState = getCardState(selectedCard);
  const dragOffset = isDragging ? (currentX - startX) / 4 : 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Card Display */}
      <div className="relative">
        <div 
          className={cn(
            "rounded-2xl p-6 text-white shadow-lg cursor-grab active:cursor-grabbing transition-transform duration-200",
            getCardGradient(selectedCard.cardBrand, cardState)
          )}
          style={{ transform: `translateX(${dragOffset}px)` }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Card Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-white/70 text-sm mb-1">Current Balance</p>
              <p className="text-3xl font-bold mb-2">
                $ {Number(selectedCard.balance ?? 0).toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </p>
              <StatusBadge 
                variant={getStateVariant(cardState)} 
                className="bg-white/20 text-white border-white/30"
              >
                {cardState === 'frozen' && <Lock className="w-3 h-3" />}
                {getStateLabel(cardState)}
              </StatusBadge>
            </div>
            
            {/* Card Brand Logo */}
            <div className="text-right">
              {selectedCard.cardBrand === 'MASTERCARD' && (
                <>
                  <div className="flex items-center gap-1 justify-end">
                    <div className="w-6 h-6 bg-red-500 rounded-full"></div>
                    <div className="w-6 h-6 bg-orange-400 rounded-full -ml-3"></div>
                  </div>
                  <p className="text-xs mt-1 text-white/90">mastercard</p>
                </>
              )}
              {selectedCard.cardBrand === 'VISA' && (
                <p className="text-lg font-bold text-white/90">VISA</p>
              )}
              {selectedCard.cardBrand === 'GNOSIS' && (
                <p className="text-lg font-bold text-white/90">DEBIT</p>
              )}
              <Badge variant="secondary" className="mt-2 bg-white/20 text-white border-white/30">
                {selectedCard.type}
              </Badge>
            </div>
          </div>
          
          {/* Card Number and Details */}
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono text-base tracking-wide mb-1 break-all">
                •••• •••• •••• {selectedCard.lastFourDigits}
              </p>
              <p className="text-white/70 text-sm">
                Card ID: {selectedCard.id.slice(0, 8)}...
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm text-white/70">
                {selectedCard.expiryDate || '--/--'}
              </p>
              {selectedCard.activatedAt && (
                <p className="text-xs text-white/60">
                  Activated {new Date(selectedCard.activatedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        {cards.length > 1 && (
          <>
            {selectedCardIndex > 0 && (
              <button
                onClick={() => onCardSelect(selectedCardIndex - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 hover:bg-black/30 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {selectedCardIndex < cards.length - 1 && (
              <button
                onClick={() => onCardSelect(selectedCardIndex + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 hover:bg-black/30 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Card Indicators */}
      {cards.length > 1 && (
        <div className="flex justify-center gap-2">
          {cards.map((_, index) => {
            const cardState = getCardState(cards[index]);
            return (
              <button
                key={index}
                onClick={() => onCardSelect(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === selectedCardIndex 
                    ? "bg-primary w-6" 
                    : cardState === 'active' 
                      ? "bg-green-300" 
                      : cardState === 'frozen'
                        ? "bg-amber-300"
                        : cardState === 'inactive'
                          ? "bg-orange-300"
                          : "bg-red-300"
                )}
              />
            );
          })}
        </div>
      )}

      {/* Card Count */}
      {cards.length > 1 && (
        <p className="text-center text-sm text-muted-foreground">
          Card {selectedCardIndex + 1} of {cards.length}
        </p>
      )}
    </div>
  );
}