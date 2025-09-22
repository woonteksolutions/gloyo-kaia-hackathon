import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiWrapper } from "@/contexts/WagmiProvider";
import { CDPProvider } from "@/contexts/CDPProvider";
import { GnosisPayProvider } from "@/contexts/GnosisPayContext";
import { useDappPortalTitle } from "@/hooks/useDappPortalTitle";
import GnosisPayApp from "./components/GnosisPayApp";
import TopUpPage from "./pages/TopUp";

const App = () => {
  // Apply DappPortal design guide for browser tab name
  useDappPortalTitle();
  
  return (
    <WagmiWrapper>
      <CDPProvider>
        <GnosisPayProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/topup" element={<TopUpPage />} />
                <Route path="/*" element={<GnosisPayApp />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </GnosisPayProvider>
      </CDPProvider>
    </WagmiWrapper>
  );
};

export default App;
