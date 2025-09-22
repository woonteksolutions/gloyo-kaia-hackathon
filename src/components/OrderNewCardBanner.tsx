import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus } from 'lucide-react';

interface OrderNewCardBannerProps {
  onOrderCard: () => void;
}

export function OrderNewCardBanner({ onOrderCard }: OrderNewCardBannerProps) {
  return (
    <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-dashed border-2 border-muted-foreground/20 hover:border-primary/40 transition-colors cursor-pointer group" onClick={onOrderCard}>
      <CardContent className="p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-20 h-12 bg-gradient-to-br from-muted-foreground/10 to-muted-foreground/5 rounded-xl flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
            <CreditCard className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
        
        <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
          Order New Card
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Get a new virtual or physical card delivered to your address
        </p>
        
        <Button variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          Order Now
        </Button>
      </CardContent>
    </Card>
  );
}