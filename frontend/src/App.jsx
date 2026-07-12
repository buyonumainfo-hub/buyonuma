import {ScrollRestoration, BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SellerAuthProvider, useSellerAuth } from './context/SellerAuthContext';
import { CartProvider } from './context/CartContext';
import { ViewedProductProvider } from './context/ViewedProductContext';
import PWAInstallPrompt from './components/shared/InstallPrompt';
import { ThemeProvider } from './context/ThemeContext';
import BottomNav from './components/shared/BottomNav';
import AIChatWidget from './components/shared/AIChatWidget';

// Public pages
import HomePage           from './pages/public/HomePage';
import SellersPage        from './pages/public/SellersPage';
import SellerDetailPage   from './pages/public/SellerDetailPage';
import ProductsPage       from './pages/public/ProductsPage';
import AboutPage          from './pages/public/AboutPage';
import ContactPage        from './pages/public/ContactPage';
import BecomeSellerPage   from './pages/public/BecomeSellerPage';
import ContactDeveloper   from './pages/public/ContactDeveloper';
import CartPage           from './pages/public/CartPage';
import TermsPage          from './pages/public/TermsPage';
import PrivacyPage        from './pages/public/PrivacyPage';
import DocsPage           from './pages/public/DocsPage';
import ScrollToTop from './components/shared/ScrollToTop'

// Admin pages
import AdminLogin      from './pages/admin/AdminLogin';
import AdminDashboard  from './pages/admin/AdminDashboard';
import AdminSellers    from './pages/admin/AdminSellers';
import AdminProducts   from './pages/admin/AdminProducts';
import AdminSettings   from './pages/admin/AdminSettings';
import AdminMonitoring from './pages/admin/AdminMonitoring';
import AdminBroadcast  from './pages/admin/AdminBroadcast';
import AdminVerification from './pages/admin/AdminVerification';

// Seller pages
import SellerLogin          from './pages/seller/SellerLogin';
import SellerRegister       from './pages/seller/SellerRegister';
import SellerForgotPassword from './pages/seller/SellerForgotPassword';
import SellerDashboard      from './pages/seller/SellerDashboard';
import SellerProducts       from './pages/seller/SellerProducts';
import SellerToken          from './pages/seller/SellerToken';
import SellerProfile        from './pages/seller/SellerProfile';
import SellerNotifications  from './pages/seller/SellerNotifications';
import SellerVerification   from './pages/seller/SellerVerification';
import SellerMonitoring     from './pages/seller/SellerMonitoring';

const Spinner = () => (
  <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
    <div className="spinner" />
  </div>
);

const AdminProtected = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Spinner />;
  return isAuthenticated ? children : <Navigate to="/admin/login" replace />;
};
const AdminPublic = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/admin" replace /> : children;
};

const SellerProtected = ({ children }) => {
  const { isAuthenticated, loading } = useSellerAuth();
  if (loading) return <Spinner />;
  return isAuthenticated ? children : <Navigate to="/seller/login" replace />;
};
const SellerPublic = ({ children }) => {
  const { isAuthenticated, loading } = useSellerAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/seller/dashboard" replace /> : children;
};

const toastOpts = {
  style: { fontFamily:'var(--font-sans)', fontSize:'0.875rem', background:'#0d0d0d', color:'#faf8f3', borderRadius:'8px' },
  success: { iconTheme: { primary:'#b8923a', secondary:'#faf8f3' } },
};

function App() {
  return (
     <ThemeProvider>
    <AuthProvider>
      <SellerAuthProvider>
        <CartProvider>
        <ViewedProductProvider>
        <BrowserRouter>
        <ScrollToTop/>
          <Toaster position="top-right" toastOptions={toastOpts} />
           {/* PWA install banner — shown on all pages */}
          <PWAInstallPrompt />
            {/* App-style bottom nav — mobile only */}
          <BottomNav />
          {/* Site-wide AI shopping assistant */}
          <AIChatWidget />
          <Routes>
            {/* ── Public ── */}
            <Route path="/home"                   element={<HomePage />} />
            <Route path="/sellers"            element={<SellersPage />} />
            <Route path="/cart"               element={<CartPage />} />
            <Route path="/terms"              element={<TermsPage />} />
            <Route path="/privacy"            element={<PrivacyPage />} />
            <Route path="/docs"               element={<DocsPage />} />
            <Route path="/about"              element={<AboutPage />} />
            <Route path="/contact"            element={<ContactPage />} />
            <Route path="/become-a-seller"    element={<BecomeSellerPage />} />
            <Route path="/developer"          element={<ContactDeveloper />} />
            <Route path="/:id"        element={<SellerDetailPage />} />
            <Route path="/"           element={<ProductsPage />} />

            {/* ── Admin ── */}
            <Route path="/admin/login"    element={<AdminPublic><AdminLogin /></AdminPublic>} />
            <Route path="/admin"          element={<AdminProtected><AdminDashboard /></AdminProtected>} />
            <Route path="/admin/sellers"  element={<AdminProtected><AdminSellers /></AdminProtected>} />
            <Route path="/admin/products" element={<AdminProtected><AdminProducts /></AdminProtected>} />
            <Route path="/admin/settings" element={<AdminProtected><AdminSettings /></AdminProtected>} />
            <Route path="/admin/monitoring"   element={<AdminProtected><AdminMonitoring /></AdminProtected>} />
            <Route path="/admin/broadcast"    element={<AdminProtected><AdminBroadcast /></AdminProtected>} />
            <Route path="/admin/verification" element={<AdminProtected><AdminVerification /></AdminProtected>} />

            {/* ── Seller ── */}
            <Route path="/seller/login"           element={<SellerPublic><SellerLogin /></SellerPublic>} />
            <Route path="/seller/register"        element={<SellerPublic><SellerRegister /></SellerPublic>} />
            <Route path="/seller/forgot-password" element={<SellerPublic><SellerForgotPassword /></SellerPublic>} />
            <Route path="/seller/dashboard"       element={<SellerProtected><SellerDashboard /></SellerProtected>} />
            <Route path="/seller/products"        element={<SellerProtected><SellerProducts /></SellerProtected>} />
            <Route path="/seller/token"           element={<SellerProtected><SellerToken /></SellerProtected>} />
            <Route path="/seller/profile"         element={<SellerProtected><SellerProfile /></SellerProtected>} />
            <Route path="/seller/notifications"   element={<SellerProtected><SellerNotifications /></SellerProtected>} />
            <Route path="/seller/verification"    element={<SellerProtected><SellerVerification /></SellerProtected>} />
            <Route path="/seller/monitoring"      element={<SellerProtected><SellerMonitoring /></SellerProtected>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </ViewedProductProvider>
        </CartProvider>
      </SellerAuthProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
