import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface JWTStatusProps {
  showDetails?: boolean;
  compact?: boolean;
}

export function JWTStatus({ showDetails = false, compact = false }: JWTStatusProps) {
  const { 
    accessToken, 
    tokenRemainingMinutes, 
    isTokenExpired, 
    refreshUserData,
    requireReauthentication 
  } = useGnosisPay();
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUserData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = () => {
    if (!accessToken || isTokenExpired) return 'destructive';
    if (tokenRemainingMinutes <= 5) return 'destructive';
    if (tokenRemainingMinutes <= 15) return 'secondary';
    return 'default';
  };

  const getStatusText = () => {
    if (!accessToken) return 'No Token';
    if (isTokenExpired) return 'Expired';
    if (tokenRemainingMinutes <= 0) return 'Expired';
    if (tokenRemainingMinutes === 1) return '1 min left';
    if (tokenRemainingMinutes < 60) return `${tokenRemainingMinutes} mins left`;
    
    const hours = Math.floor(tokenRemainingMinutes / 60);
    const mins = tokenRemainingMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`;
  };

  const getStatusIcon = () => {
    if (!accessToken || isTokenExpired) {
      return <AlertTriangle className="w-4 h-4" />;
    }
    if (tokenRemainingMinutes <= 5) {
      return <AlertTriangle className="w-4 h-4" />;
    }
    return <CheckCircle className="w-4 h-4" />;
  };

  // Don't show anything if no token and not in development
  if (!accessToken && process.env.NODE_ENV === 'production') {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {getStatusIcon()}
        <span className="text-muted-foreground">JWT:</span>
        <Badge variant={getStatusColor()}>
          {getStatusText()}
        </Badge>
        {(isTokenExpired || tokenRemainingMinutes <= 5) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={requireReauthentication}
            className="h-6 px-2 text-xs"
          >
            Reauth
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="w-4 h-4" />
          JWT Token Status
        </CardTitle>
        <CardDescription>
          Gnosis Pay authentication token validity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">{getStatusText()}</span>
          </div>
          <Badge variant={getStatusColor()}>
            {accessToken ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {showDetails && accessToken && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Token: {accessToken.slice(0, 20)}...</div>
            {!isTokenExpired && (
              <div>
                Expires: {new Date(Date.now() + tokenRemainingMinutes * 60 * 1000).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {(isTokenExpired || tokenRemainingMinutes <= 5) && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={requireReauthentication}
              className="flex-1"
            >
              Re-authenticate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}

        {tokenRemainingMinutes > 5 && tokenRemainingMinutes <= 15 && (
          <div className="text-xs text-amber-600 dark:text-amber-400">
            ⚠️ Session will expire soon. You may want to complete important actions.
          </div>
        )}
      </CardContent>
    </Card>
  );
}