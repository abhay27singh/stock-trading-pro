import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CssBaseline, Box, ThemeProvider, CircularProgress } from '@mui/material';
import theme from './theme';
import './styles/animations.css';
import Navbar from './components/Navbar';
import PageTransition from './components/PageTransition';
import Footer from './components/Footer';

// Each page is its own chunk, fetched when its route is first visited. Previously every
// page (including the admin screens and the options desk with its chart code) shipped in
// the single bundle the login screen had to download before it could render.
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Stocks = lazy(() => import('./pages/Stocks'));
const Options = lazy(() => import('./pages/Options'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Admin = lazy(() => import('./pages/Admin'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const NotFound = lazy(() => import('./pages/NotFound'));

/** Shown while a route's chunk is in flight. Centred so it does not shift the layout. */
const RouteFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <CircularProgress />
  </Box>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/dashboard" />;
  return children;
};

const AnimatedRoutes = () => {
  const { user } = useAuth();
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteFallback />}>
      <Routes location={location} key={location.pathname}>
        {/* The site root. Without this, "/" falls through to the catch-all and shows
            the 404 page, which is wrong for the most common entry point of all: it is
            a valid address, it just has no page of its own. Send people where they
            were going instead. */}
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        <Route path="/login" element={
          user ? <Navigate to="/dashboard" /> : <PageTransition><Login /></PageTransition>
        } />
        <Route path="/register" element={
          user ? <Navigate to="/dashboard" /> : <PageTransition><Register /></PageTransition>
        } />
        <Route path="/dashboard" element={
          <PrivateRoute><PageTransition><Dashboard /></PageTransition></PrivateRoute>
        } />
        <Route path="/stocks" element={
          <PrivateRoute><PageTransition><Stocks /></PageTransition></PrivateRoute>
        } />
        <Route path="/options" element={
          <PrivateRoute><PageTransition><Options /></PageTransition></PrivateRoute>
        } />
        <Route path="/portfolio" element={
          <PrivateRoute><PageTransition><Portfolio /></PageTransition></PrivateRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute><PageTransition><Admin /></PageTransition></AdminRoute>
        } />
        <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      {user && <Navbar />}
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1 }}>
          <AnimatedRoutes />
        </Box>
        <Footer />
      </Box>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;