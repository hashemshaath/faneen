import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import BusinessProfile from "./pages/BusinessProfile";
import Search from "./pages/Search";
import Contracts from "./pages/Contracts";
import ContractDetail from "./pages/ContractDetail";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import DashboardServices from "./pages/dashboard/DashboardServices";
import DashboardPortfolio from "./pages/dashboard/DashboardPortfolio";
import DashboardReviews from "./pages/dashboard/DashboardReviews";
import DashboardContracts from "./pages/dashboard/DashboardContracts";
import DashboardWarranties from "./pages/dashboard/DashboardWarranties";
import DashboardSettings from "./pages/dashboard/DashboardSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/search" element={<Search />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/contracts/:id" element={<ContractDetail />} />
              <Route path="/dashboard" element={<DashboardOverview />} />
              <Route path="/dashboard/services" element={<DashboardServices />} />
              <Route path="/dashboard/portfolio" element={<DashboardPortfolio />} />
              <Route path="/dashboard/reviews" element={<DashboardReviews />} />
              <Route path="/dashboard/contracts" element={<DashboardContracts />} />
              <Route path="/dashboard/warranties" element={<DashboardWarranties />} />
              <Route path="/dashboard/settings" element={<DashboardSettings />} />
              <Route path="/:username" element={<BusinessProfile />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
