import { useState } from 'react';
import {ScrollRestoration, BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SellerAuthProvider, useSellerAuth } from './context/SellerAuthContext';
import { BuyerAuthProvider, useBuyerAuth } from './context/BuyerAuthContext';
import { AffiliateAuthProvider, useAffiliateAuth } from './context/AffiliateAuthContext';
import { CartProvider } from './context/CartContext';
import { ViewedProductProvider } from './context/ViewedProductContext';
import PWAInstallPrompt from './components/shared/InstallPrompt';
import { ThemeProvider } from './context/ThemeContext';
import BottomNav from './components/shared/BottomNav';
import AuthNudgeModal from './components/shared/AuthNudgeModal';
import AIChatWidget from './components/shared/AIChatWidget';

// Public pages
import HomePage           from './pages/public/HomePage';
import SellersPage        from './pages/public/SellersPage';
import SellerDetailPage   from './pages/public/SellerDetailPage';
import ProductDetailPage  from './pages/public/ProductDetailPage';
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

// Buyer pages
import BuyerLogin     from './pages/buyer/BuyerLogin';
import BuyerRegister  from './pages/buyer/BuyerRegister';
import BuyerDashboard from './pages/buyer/BuyerDashboard';

// Admin pages
import AdminLogin      from './pages/admin/AdminLogin';
import AdminDashboard  from './pages/admin/AdminDashboard';
import AdminSellers    from './pages/admin/AdminSellers';
import AdminProducts   from './pages/admin/AdminProducts';
import AdminSettings   from './pages/admin/AdminSettings';
import AdminMonitoring from './pages/admin/AdminMonitoring';
import AdminBroadcast  from './pages/admin/AdminBroadcast';
import AdminVerification from './pages/admin/AdminVerification';
import AdminRoles      from './pages/admin/AdminRoles';
import AdminRevenue    from './pages/admin/AdminRevenue';
import AdminPlans      from './pages/admin/AdminPlans';
import AdminAffiliates from './pages/admin/AdminAffiliates';

// Seller pages
import SellerLogin          from './pages/seller/SellerLogin';
import SellerRegister       from './pages/seller/SellerRegister';
import SellerForgotPassword from './pages/seller/SellerForgotPassword';
import SellerDashboard      from './pages/seller/SellerDashboard';
import SellerStorePreviewPage      from './pages/seller/StorePage';
import SellerProducts       from './pages/seller/SellerProducts';
import SellerToken          from './pages/seller/SellerToken';
import SellerProfile        from './pages/seller/SellerProfile';
import SellerNotifications  from './pages/seller/SellerNotifications';
import SellerVerification   from './pages/seller/SellerVerification';
import SellerMonitoring     from './pages/seller/SellerMonitoring';
import SellerSettings       from './pages/seller/SellerSettings';
import SellerPlan           from './pages/seller/SellerPlan';
import SellerMessages       from './pages/seller/SellerMessages';
import LoadFailedModal      from './components/seller/LoadFailedModal';

// Affiliate pages
import AffiliateLogin      from './pages/affiliate/AffiliateLogin';
import AffiliateRegister   from './pages/affiliate/AffiliateRegister';
import AffiliateDashboard  from './pages/affiliate/AffiliateDashboard';
import AffiliateReferrals  from './pages/affiliate/AffiliateReferrals';
import AffiliateEarnings   from './pages/affiliate/AffiliateEarnings';
import AffiliateProfile    from './pages/affiliate/AffiliateProfile';

const Spinner = () => (
  <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
    <div className="spinner" />
  </div>
);

const AdminProtected = ({ children, permission }) => {
  const { isAuthenticated, loading, hasPermission } = useAuth();
  if (loading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  // A logged-in admin whose role doesn't cover this page gets sent back
  // to the dashboard rather than a raw 403 from an API call — the nav
  // already hides pages they can't use (see AdminLayout), this just
  // covers someone hitting the URL directly.
  if (permission && !hasPermission(permission)) return <Navigate to="/admin" replace />;
  return children;
};
const AdminPublic = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/admin" replace /> : children;
};

const SellerProtected = ({ children }) => {
  const { isAuthenticated, loading, authError, retryAuth } = useSellerAuth();
  const [retrying, setRetrying] = useState(false);

  if (loading) return <Spinner />;

  // BUG FIX: previously, ANY failure of the initial auth check — a
  // network blip, a backend 500, a rate limit — fell straight through to
  // `!isAuthenticated` and redirected to /seller/login, even for a
  // seller with a perfectly valid session. That's what made pages like
  // Profile (and every other seller page) appear to silently fail or
  // "lose" the seller with no explanation. A genuine load error now
  // shows a retry option instead of assuming the seller is logged out.
  if (authError) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream, #faf8f3)' }}>
        <LoadFailedModal
          onRetry={() => { setRetrying(true); retryAuth(); }}
          retrying={retrying}
          title="Couldn't verify your session"
          message="We couldn't reach the server to confirm you're signed in. Please check your connection and try again — you won't be logged out."
        />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/seller/login" replace />;
};
const SellerPublic = ({ children }) => {
  const { isAuthenticated, loading } = useSellerAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/seller/dashboard" replace /> : children;
};

const BuyerProtected = ({ children }) => {
  const { isAuthenticated, loading } = useBuyerAuth();
  if (loading) return <Spinner />;
  return isAuthenticated ? children : <Navigate to="/buyer/login" replace />;
};
const BuyerPublic = ({ children }) => {
  const { isAuthenticated, loading } = useBuyerAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/buyer/dashboard" replace /> : children;
};

const AffiliateProtected = ({ children }) => {
  const { isAuthenticated, loading } = useAffiliateAuth();
  if (loading) return <Spinner />;
  return isAuthenticated ? children : <Navigate to="/affiliate/login" replace />;
};
const AffiliatePublic = ({ children }) => {
  const { isAuthenticated, loading } = useAffiliateAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/affiliate/dashboard" replace /> : children;
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
        <BuyerAuthProvider>
        <AffiliateAuthProvider>
        <CartProvider>
        <ViewedProductProvider>
        <BrowserRouter>
        <ScrollToTop/>
          <Toaster position="top-right" toastOptions={toastOpts} />
           {/* PWA install banner — shown on all pages */}
          <PWAInstallPrompt />
            {/* App-style bottom nav — mobile only */}
          <BottomNav />
          <AuthNudgeModal />
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
            <Route path="/product/:id"        element={<ProductDetailPage />} />
            <Route path="/:id"        element={<SellerDetailPage />} />
            <Route path="/"           element={<ProductsPage />} />

            {/* ── Buyer ── */}
            <Route path="/buyer/login"     element={<BuyerPublic><BuyerLogin /></BuyerPublic>} />
            <Route path="/buyer/register"  element={<BuyerPublic><BuyerRegister /></BuyerPublic>} />
            <Route path="/buyer/dashboard" element={<BuyerProtected><BuyerDashboard /></BuyerProtected>} />

            {/* ── Admin ── */}
            <Route path="/admin/login"    element={<AdminPublic><AdminLogin /></AdminPublic>} />
            <Route path="/admin"          element={<AdminProtected><AdminDashboard /></AdminProtected>} />
            <Route path="/admin/sellers"  element={<AdminProtected permission="sellers.view"><AdminSellers /></AdminProtected>} />
            <Route path="/admin/products" element={<AdminProtected permission="products.view"><AdminProducts /></AdminProtected>} />
            <Route path="/admin/settings" element={<AdminProtected permission="settings.edit"><AdminSettings /></AdminProtected>} />
            <Route path="/admin/monitoring"   element={<AdminProtected permission="monitoring.view"><AdminMonitoring /></AdminProtected>} />
            <Route path="/admin/broadcast"    element={<AdminProtected permission="broadcast.send"><AdminBroadcast /></AdminProtected>} />
            <Route path="/admin/verification" element={<AdminProtected permission="verification.review"><AdminVerification /></AdminProtected>} />
            <Route path="/admin/roles"        element={<AdminProtected permission="roles.manage"><AdminRoles /></AdminProtected>} />
            <Route path="/admin/revenue"      element={<AdminProtected permission="payments.view"><AdminRevenue /></AdminProtected>} />
            <Route path="/admin/plans"        element={<AdminProtected permission="plans.manage"><AdminPlans /></AdminProtected>} />
            <Route path="/admin/affiliates"   element={<AdminProtected permission="affiliates.manage"><AdminAffiliates /></AdminProtected>} />

            {/* ── Seller ── */}
            <Route path="/seller/login"           element={<SellerPublic><SellerLogin /></SellerPublic>} />
            <Route path="/seller/register"        element={<SellerPublic><SellerRegister /></SellerPublic>} />
            <Route path="/seller/forgot-password" element={<SellerPublic><SellerForgotPassword /></SellerPublic>} />
            <Route path="/seller/dashboard"       element={<SellerProtected><SellerDashboard /></SellerProtected>} />
            <Route path="/seller/products"        element={<SellerProtected><SellerProducts /></SellerProtected>} />
            <Route path="/seller/token"           element={<SellerProtected><SellerToken /></SellerProtected>} />
            <Route path="/seller/profile"         element={<SellerProtected><SellerProfile /></SellerProtected>} />
            <Route path="/seller/store"         element={<SellerProtected><SellerStorePreviewPage /></SellerProtected>} />
            <Route path="/seller/notifications"   element={<SellerProtected><SellerNotifications /></SellerProtected>} />
            <Route path="/seller/verification"    element={<SellerProtected><SellerVerification /></SellerProtected>} />
            <Route path="/seller/monitoring"      element={<SellerProtected><SellerMonitoring /></SellerProtected>} />
            <Route path="/seller/settings"        element={<SellerProtected><SellerSettings /></SellerProtected>} />
            <Route path="/seller/plan"            element={<SellerProtected><SellerPlan /></SellerProtected>} />
            <Route path="/seller/messages"        element={<SellerProtected><SellerMessages /></SellerProtected>} />

            {/* ── Affiliate ── */}
            <Route path="/affiliate/login"     element={<AffiliatePublic><AffiliateLogin /></AffiliatePublic>} />
            <Route path="/affiliate/register"  element={<AffiliatePublic><AffiliateRegister /></AffiliatePublic>} />
            <Route path="/affiliate/dashboard" element={<AffiliateProtected><AffiliateDashboard /></AffiliateProtected>} />
            <Route path="/affiliate/referrals" element={<AffiliateProtected><AffiliateReferrals /></AffiliateProtected>} />
            <Route path="/affiliate/earnings"  element={<AffiliateProtected><AffiliateEarnings /></AffiliateProtected>} />
            <Route path="/affiliate/profile"   element={<AffiliateProtected><AffiliateProfile /></AffiliateProtected>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </ViewedProductProvider>
        </CartProvider>
        </AffiliateAuthProvider>
        </BuyerAuthProvider>
      </SellerAuthProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
