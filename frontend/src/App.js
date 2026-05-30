import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from "@/lib/configStore";
import { Toaster } from "@/components/ui/sonner";
import BuyerView from "@/pages/BuyerView";
import OrderTrackPage from "@/pages/OrderTrackPage";
import AdminLogin from "@/pages/admin/Login";
import AdminLayout from "@/components/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import HeroEdit from "@/pages/admin/HeroEdit";
import KeunggulanEdit from "@/pages/admin/KeunggulanEdit";
import CaraKerjaEdit from "@/pages/admin/CaraKerjaEdit";
import FooterEdit from "@/pages/admin/FooterEdit";
import PaketEdit from "@/pages/admin/PaketEdit";
import HargaCalc from "@/pages/admin/HargaCalc";
import DomainEdit from "@/pages/admin/DomainEdit";
import PasswordChange from "@/pages/admin/PasswordChange";
import PaymentSettings from "@/pages/admin/PaymentSettings";
import TestimonialsEdit from "@/pages/admin/TestimonialsEdit";
import FAQEdit from "@/pages/admin/FAQEdit";
import AdminOrders from "@/pages/admin/Orders";
import AdminOrderDetail from "@/pages/admin/OrderDetail";
import { getToken } from "@/lib/api";

function RequireAuth({ children }) {
  if (!getToken()) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <ConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<BuyerView />} />
          <Route path="/order/:token" element={<OrderTrackPage />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:code" element={<AdminOrderDetail />} />
            <Route path="hero" element={<HeroEdit />} />
            <Route path="keunggulan" element={<KeunggulanEdit />} />
            <Route path="cara-kerja" element={<CaraKerjaEdit />} />
            <Route path="testimoni" element={<TestimonialsEdit />} />
            <Route path="faq" element={<FAQEdit />} />
            <Route path="footer" element={<FooterEdit />} />
            <Route path="paket" element={<PaketEdit />} />
            <Route path="harga" element={<HargaCalc />} />
            <Route path="domain" element={<DomainEdit />} />
            <Route path="pembayaran" element={<PaymentSettings />} />
            <Route path="password" element={<PasswordChange />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </ConfigProvider>
  );
}
