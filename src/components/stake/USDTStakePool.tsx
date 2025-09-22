import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Coins, TrendingUp, Lock, Unlock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';

interface USDTStakePoolProps {
  userBalance?: string;
  stakedAmount?: string;
  onStake?: (amount: string) => Promise<void>;
  onUnstake?: (amount: string) => Promise<void>;
}

export default function USDTStakePool({ 
  userBalance = "0.00",
  stakedAmount = "0.00",
  onStake,
  onUnstake 
}: USDTStakePoolProps) {
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [showStakeDialog, setShowStakeDialog] = useState(false);
  const [showUnstakeDialog, setShowUnstakeDialog] = useState(false);
  const { toast } = useToast();

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to stake",
        variant: "destructive"
      });
      return;
    }

    if (parseFloat(stakeAmount) > parseFloat(userBalance)) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough USDT to stake",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsStaking(true);
      if (onStake) {
        await onStake(stakeAmount);
      }
      toast({
        title: "Stake Successful",
        description: `Successfully staked ${stakeAmount} USDT`,
      });
      setStakeAmount("");
      setShowStakeDialog(false);
    } catch (error) {
      toast({
        title: "Stake Failed",
        description: "Failed to stake USDT. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      toast({
        title: "Invalid Amount", 
        description: "Please enter a valid amount to unstake",
        variant: "destructive"
      });
      return;
    }

    if (parseFloat(unstakeAmount) > parseFloat(stakedAmount)) {
      toast({
        title: "Insufficient Staked Amount",
        description: "You don't have enough staked USDT to unstake",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUnstaking(true);
      if (onUnstake) {
        await onUnstake(unstakeAmount);
      }
      toast({
        title: "Unstake Successful",
        description: `Successfully unstaked ${unstakeAmount} USDT`,
      });
      setUnstakeAmount("");
      setShowUnstakeDialog(false);
    } catch (error) {
      toast({
        title: "Unstake Failed",
        description: "Failed to unstake USDT. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUnstaking(false);
    }
  };

  const setMaxStake = () => {
    setStakeAmount(userBalance);
  };

  const setMaxUnstake = () => {
    setUnstakeAmount(stakedAmount);
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            <CardTitle>USDT Pool</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <TrendingUp className="h-3 w-3 mr-1" />
            8.5% APY
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Kaia Network • Variable rate
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Pool Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="font-semibold">{formatCurrency(userBalance)} USDT</p>
          </div>
          <div className="p-3 bg-primary/5 rounded-lg">
            <p className="text-sm text-muted-foreground">Staked</p>
            <p className="font-semibold text-primary">{formatCurrency(stakedAmount)} USDT</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Dialog open={showStakeDialog} onOpenChange={setShowStakeDialog}>
            <DialogTrigger asChild>
              <Button 
                className="flex-1" 
                disabled={parseFloat(userBalance) <= 0}
              >
                <Lock className="h-4 w-4 mr-2" />
                Stake
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Stake USDT</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stake-amount">Amount to stake</Label>
                  <div className="flex gap-2">
                    <Input
                      id="stake-amount"
                      placeholder="0.00"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      type="number"
                      step="0.01"
                      min="0"
                    />
                    <Button 
                      variant="outline" 
                      onClick={setMaxStake}
                      disabled={parseFloat(userBalance) <= 0}
                    >
                      Max
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available: {formatCurrency(userBalance)} USDT
                  </p>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">Expected APY: <span className="font-semibold text-green-600">8.5%</span></p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rewards are distributed daily and compound automatically
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowStakeDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleStake}
                    disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0}
                  >
                    {isStaking ? "Staking..." : "Confirm Stake"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showUnstakeDialog} onOpenChange={setShowUnstakeDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="flex-1"
                disabled={parseFloat(stakedAmount) <= 0}
              >
                <Unlock className="h-4 w-4 mr-2" />
                Unstake
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Unstake USDT</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="unstake-amount">Amount to unstake</Label>
                  <div className="flex gap-2">
                    <Input
                      id="unstake-amount"
                      placeholder="0.00"
                      value={unstakeAmount}
                      onChange={(e) => setUnstakeAmount(e.target.value)}
                      type="number"
                      step="0.01"
                      min="0"
                    />
                    <Button 
                      variant="outline" 
                      onClick={setMaxUnstake}
                      disabled={parseFloat(stakedAmount) <= 0}
                    >
                      Max
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Staked: {formatCurrency(stakedAmount)} USDT
                  </p>
                </div>
                
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    ⚠️ Unstaking may take up to 7 days to process
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    You will stop earning rewards immediately
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowUnstakeDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="flex-1" 
                    onClick={handleUnstake}
                    disabled={isUnstaking || !unstakeAmount || parseFloat(unstakeAmount) <= 0}
                  >
                    {isUnstaking ? "Unstaking..." : "Confirm Unstake"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pool Info */}
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>• Rewards are paid in USDT and compound automatically</p>
          <p>• No lockup period - unstake anytime</p>
          <p>• Smart contract audited by leading security firms</p>
        </div>
      </CardContent>
    </Card>
  );
}