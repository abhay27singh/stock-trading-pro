import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { tradeService, stockService, userService } from '../services/api';
import AddFunds from '../components/AddFunds';
import AnimatedPrice from '../components/AnimatedPrice';
import { COLORS } from '../theme';
import { Container, Grid, Paper, Typography, Box, CircularProgress, Chip } from '@mui/material';
import { TrendingUp, AccountBalance, Inventory2 } from '@mui/icons-material';

const StatCard = ({ icon, label, children, accent, index, action }) => (
  <Paper
    component={motion.div}
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08, duration: 0.4 }}
    whileHover={{ y: -4 }}
    sx={{
      p: 3,
      height: '100%',            
      position: 'relative',
      overflow: 'hidden',
      borderColor: `${accent}55`,
      boxShadow: `0 8px 30px ${accent}22`,
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0, left: 0, right: 0, height: '3px',
        background: `linear-gradient(90deg, ${accent}, transparent)`,
      },
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{
          width: 48, height: 48, borderRadius: 2, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: `${accent}1f`, color: accent,
        }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" sx={{ color: COLORS.textDim }}>{label}</Typography>
          <Typography variant="h5" fontWeight={700} className="num">{children}</Typography>
        </Box>
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Box>
  </Paper>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await userService.getProfile();
        setBalance(Number(res.data.balance) || 0);
      } catch { setBalance(0); }
    };
    fetchBalance();
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [portfolioRes, stocksRes] = await Promise.all([
        tradeService.getPortfolio(),
        stockService.getAllStocks(),
      ]);
      setPortfolio(Array.isArray(portfolioRes.data) ? portfolioRes.data : []);
      setStocks(Array.isArray(stocksRes.data) ? stocksRes.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculatePortfolioValue = () => {
    return portfolio.reduce((total, item) => {
      const stock = stocks.find(s => s.symbol === item.symbol);
      return total + (stock ? stock.currentPrice : item.avgBuyPrice) * item.quantity;
    }, 0);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress size={60} /></Box>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="caption" sx={{ color: COLORS.textDim, fontWeight: 700, letterSpacing: 1.5 }}>
          {greeting.toUpperCase()}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
          {user?.name?.trim()}
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS.textDim, mt: 0.5 }}>
          {today} · Here's your portfolio overview
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            index={0}
            icon={<AccountBalance />}
            label="Available Balance"
            accent={COLORS.accent}
            action={<AddFunds onSuccess={(newBalance) => setBalance(Number(newBalance))} />}
          >
            <AnimatedPrice value={balance} />
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard index={1} icon={<TrendingUp />} label="Portfolio Value" accent={COLORS.info}>
            <AnimatedPrice value={calculatePortfolioValue()} />
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard index={2} icon={<Inventory2 />} label="Stocks Owned" accent={COLORS.warn}>
            {portfolio.length} Stocks
          </StatCard>
        </Grid>
      </Grid>

      <Paper
        component={motion.div}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        sx={{ p: 3 }}
      >
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Inventory2 fontSize="inherit" aria-hidden="true" />
          My Portfolio
        </Typography>
        {portfolio.length === 0 ? (
          <Typography color="text.secondary">No stocks owned yet. Head to Markets and start trading!</Typography>
        ) : (
          <Grid container spacing={2}>
            {portfolio.map((item, i) => {
              const stock = stocks.find(s => s.symbol === item.symbol);
              const invested = item.avgBuyPrice * item.quantity;
              const currentVal = stock ? (stock.currentPrice * item.quantity) : invested;
              const profit = currentVal - invested;
              const isProfit = profit >= 0;
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
                  <Box
                    component={motion.div}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    sx={{
                      p: 2,
                      bgcolor: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      borderLeft: `3px solid ${isProfit ? COLORS.up : COLORS.down}`,
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography fontWeight={800}>
                        {item.symbol}
                      </Typography>
                      <Chip
                        label={`${isProfit ? '+' : ''}₹${profit.toFixed(2)}`}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          bgcolor: isProfit ? COLORS.upDim : COLORS.downDim,
                          color: isProfit ? COLORS.up : COLORS.down,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {item.quantity} shares @ ₹{item.avgBuyPrice}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Current Value: ₹{Number(currentVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>
    </Container>
  );
};

export default Dashboard;
