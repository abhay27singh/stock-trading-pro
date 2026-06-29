import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';
import { AppBar, Toolbar, Typography, Button, Box, Chip } from '@mui/material';
import { Dashboard, ShowChart, Logout, AccountBalance, AdminPanelSettings, Calculate } from '@mui/icons-material';
import { COLORS } from '../theme';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navBalance, setNavBalance] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await userService.getProfile();
        setNavBalance(Number(res.data.balance) || 0);
      } catch {
        setNavBalance(0);
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;

  const navItem = (path, label, Icon) => (
    <Button
      color="inherit"
      startIcon={<Icon />}
      onClick={() => navigate(path)}
      sx={{
        color: isActive(path) ? COLORS.accent : COLORS.textDim,
        bgcolor: isActive(path) ? 'rgba(34,197,94,0.10)' : 'transparent',
        border: `1px solid ${isActive(path) ? 'rgba(34,197,94,0.4)' : 'transparent'}`,
        borderRadius: 2,
        px: 1.6,
        '&:hover': { color: COLORS.text, bgcolor: 'rgba(255,255,255,0.04)' },
      }}
    >
      {label}
    </Button>
  );

  return (
    <AppBar position="sticky">
      <Toolbar>
        <Box
          component={motion.div}
          whileHover={{ scale: 1.04 }}
          onClick={() => navigate('/dashboard')}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', mr: 4 }}
        >
          <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
            <span style={{ color: COLORS.accent }}>▲</span>{' '}
            Stock<span style={{ color: COLORS.accent }}>Trading</span>
            <Typography component="span" sx={{ color: COLORS.textDim, fontSize: 12, ml: 0.5 }}>
              PRO
            </Typography>
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          {navItem('/dashboard', 'Dashboard', Dashboard)}
          {navItem('/stocks', 'Markets', ShowChart)}
          {navItem('/options', 'Options', Calculate)}
          {navItem('/portfolio', 'Portfolio', AccountBalance)}
          {isAdmin && navItem('/admin', 'Admin', AdminPanelSettings)}
        </Box>

        <Box display="flex" alignItems="center" gap={2}>
          <Chip
            component={motion.div}
            key={navBalance}
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            label={`₹${Number(navBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            sx={{
              bgcolor: 'rgba(34,197,94,0.10)',
              color: COLORS.accent,
              border: `1px solid rgba(34,197,94,0.35)`,
              fontWeight: 800,
            }}
          />
          <Typography variant="body2" sx={{ color: COLORS.textDim }}>{user?.name}</Typography>
          <Button
            startIcon={<Logout />}
            onClick={handleLogout}
            sx={{ color: COLORS.textDim, '&:hover': { color: COLORS.down } }}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
