import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import PaymentMethods from "./pages/PaymentMethods";
import Settings from "./pages/Settings";
import StockEntry from "./pages/StockEntry";
import Sales from "./pages/Sales";
import SalesByProduct from "./pages/reports/SalesByProduct";
import SalesHistory from "./pages/reports/SalesHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/payment-methods" element={<PaymentMethods />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/stock-entry" element={<StockEntry />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/reports/sales-by-product" element={<SalesByProduct />} />
            <Route path="/reports/sales-history" element={<SalesHistory />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
