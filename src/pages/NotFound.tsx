import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 mobile-safe">
      <div className="w-full max-w-md space-y-6 fade-in">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-destructive/20 to-destructive/10 rounded-3xl flex items-center justify-center shadow-mobile-card">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">404</h1>
            <p className="text-muted-foreground mt-2 text-base">
              Oops! This page doesn't exist
            </p>
          </div>
        </div>

        <Card className="mobile-card bg-gradient-to-r from-card to-primary/5 border-primary/20">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">
              The page you're looking for has moved or doesn't exist.
            </p>
            <Button 
              onClick={() => window.location.href = "/"}
              className="w-full h-12 rounded-xl font-medium text-base shadow-mobile-button"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
