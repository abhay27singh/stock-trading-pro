import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CssBaseline, Box, ThemeProvider } from '@mui/material';
import theme from './theme';
import './styles/animations.css';
import Navbar from './components/Navbar';
import PageTransition from './components/PageTransition';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Stocks from './pages/Stocks';
import Options from './pages/Options';
import Portfolio from './pages/Portfolio';
import Admin from './pages/Admin';

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
      <Routes location={location} key={location.pathname}>
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
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </AnimatePresence>
  );
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      {user && <Navbar />}
      <Box sx={{ minHeight: '100vh' }}>
        <AnimatedRoutes />
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