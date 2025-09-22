import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Clock, TrendingUp } from 'lucide-react';
import { QuoteRequest, QuoteResponse, getQuote, validateBridgeRequest } from '@/services/rhinoService';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDuration, formatAddress } from '@/lib/formatters';

interface SimpleAmountEntryProps {
  quoteRequest: QuoteRequest | null;
  onAmountAndQuote: (amount: string, quote: QuoteResponse) => void;
  disabled?: boolean;
}

export default function SimpleAmountEntry({ 
  quoteRequest, 
  onAmountAndQuote, 
  disabled = false 
}: SimpleAmountEntryProps) {
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuoteTime, setLastQuoteTime] = useState<Date | null>(null);
  const { toast } = useToast();

  const quickAmounts = ['10', '50', '100', '500'];

  // Auto-fetch quote when amount changes
  useEffect(() => {
    if (amount && parseFloat(amount) >= 0.1 && quoteRequest) {
      const timeoutId = setTimeout(() => {
        fetchQuote();
      }, 500); // Debounce

      return () => clearTimeout(timeoutId);
    } else {
      setQuote(null);
      setError(null);
    }
  }, [amount, quoteRequest]);

  const fetchQuote = useCallback(async () => {
    if (!quoteRequest || !amount) return;

    try {
      setLoading(true);
      setError(null);

      const request = { ...quoteRequest, amount };
      const validationErrors = validateBridgeRequest(request);
      
      if (validationErrors.length > 0) {
        setError(validationErrors[0]);
        return;
      }

      const quoteResponse = await getQuote(request);
      setQuote(quoteResponse as any);
      setLastQuoteTime(new Date());
      
    } catch (err: any) {
      console.error('Quote fetch error:', err);
      setError(err.message);
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [quoteRequest, amount]);

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleQuickAmount = (quickAmount: string) => {
    setAmount(quickAmount);
  };

  const handleContinue = () => {
    if (quote && amount) {
      onAmountAndQuote(amount, quote);
    }
  };

  const isQuoteExpired = () => {
    if (!quote || !lastQuoteTime) return false;
    const expiresAt = new Date(quote.expiresAt);
    return new Date() > expiresAt;
  };

  if (!quoteRequest) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Missing bridge configuration</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Amount Entry */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Amount ({quoteRequest.tokenIn})
          </label>
          <Input
            type="text"
            placeholder="0.00"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="text-lg h-12"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground mt-1">Minimum: 0.1</p>
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2">
          {quickAmounts.map((quickAmount) => (
            <Button
              key={quickAmount}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAmount(quickAmount)}
              disabled={disabled}
            >
              {quickAmount}
            </Button>
          ))}
        </div>
      </div>


      {/* Quote Display */}
      {quote && !loading && (
        <Card className={isQuoteExpired() ? 'border-orange-200 bg-orange-50' : ''}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Quote</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchQuote}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">You pay:</span>
                <span className="font-medium">
                  {formatCurrency(quote.payAmount)} {quoteRequest.tokenIn}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">You receive:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(quote.receiveAmount)} {quoteRequest.tokenOut}
                </span>
              </div>

              <Separator />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Top up fee:</span>
                <span>{formatCurrency(quote.fees)} {quoteRequest.tokenIn}</span>
              </div>
              
              {quote.platformFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform fee:</span>
                  <span>{formatCurrency(quote.platformFee)} {quoteRequest.tokenIn}</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Duration:
                </span>
                <span>{formatDuration(quote.estimatedDuration)}</span>
              </div>

              {quote.direct && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  Direct bridge (fastest)
                </div>
              )}
            </div>

            {isQuoteExpired() && (
              <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
                Quote expired. Click refresh to get a new quote.
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="text-sm text-red-600">{error}</div>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <div className="flex-1 flex flex-col justify-end pt-4">
        <Button
          className="w-full"
          onClick={handleContinue}
          disabled={disabled || loading || !quote || !amount || isQuoteExpired() || !!error}
        >
          {loading ? 'Getting quote...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}