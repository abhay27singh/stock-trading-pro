import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { tradeService, stockService } from '../services/api';
import { COLORS } from '../theme';
import {
  Container, Paper, Typography, Box,
  Chip, CircularProgress, Grid
} from '@mui/material';
import { TrendingUp, TrendingDown, AccountBalanceWallet, History } from '@mui/icons-material';

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [portfolioRes, transRes, stocksRes] = await Promise.all([
        tradeService.getPortfolio(),
        tradeService.getHistory(),
        stockService.getAllStocks(),
      ]);
      setPortfolio(Array.isArray(portfolioRes.data) ? portfolioRes.data : []);
      setTransactions(Array.isArray(transRes.data) ? transRes.data : []);
      setStocks(Array.isArray(stocksRes.data) ? stocksRes.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <CircularProgress size={60} />
    </Box>
  );

  // Aggregate totals
  const totals = portfolio.reduce((acc, item) => {
    const stock = stocks.find(s => s.symbol === item.symbol);
    const inv = item.avgBuyPrice * item.quantity;
    const cur = stock ? stock.currentPrice * item.quantity : inv;
    acc.current += cur;
    acc.invested += inv;
    return acc;
  }, { current: 0, invested: 0 });
  const totalPL = totals.current - totals.invested;
  const totalPLpct = totals.invested ? (totalPL / totals.invested) * 100 : 0;
  const totalUp = totalPL >= 0;

  const SectionHeader = ({ icon, title }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
      <Box sx={{
        width: 36, height: 36, borderRadius: 1.5, color: COLORS.accent,
        bgcolor: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</Box>
      <Typography variant="h6" fontWeight={800}>{title}</Typography>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography
        variant="h4"
        sx={{ mb: 3, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}
      >
        <AccountBalanceWallet fontSize="inherit" aria-hidden="true" />
        My <span style={{ color: COLORS.accent }}>Portfolio</span>
      </Typography>

      {/* Summary bar */}
      <Paper
        component={motion.div}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        sx={{ p: 3, mb: 3, display: 'flex', flexWrap: 'wrap', gap: 4 }}
      >
        {[
          { label: 'Invested', value: totals.invested, color: COLORS.text },
          { label: 'Current Value', value: totals.current, color: COLORS.info },
          { label: 'Total P&L', value: totalPL, color: totalUp ? COLORS.up : COLORS.down, pct: totalPLpct, signed: true },
        ].map((s) => (
          <Box key={s.label}>
            <Typography variant="body2" sx={{ color: COLORS.textDim }}>{s.label}</Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>
              {s.signed && s.value >= 0 ? '+' : ''}₹{Number(s.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              {s.pct !== undefined && (
                <Typography component="span" variant="body2" sx={{ ml: 1, color: s.color }}>
                  ({totalUp ? '+' : ''}{s.pct.toFixed(2)}%)
                </Typography>
              )}
            </Typography>
          </Box>
        ))}
      </Paper>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            component={motion.div}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
            sx={{ p: 3 }}
          >
            <SectionHeader icon={<AccountBalanceWallet fontSize="small" />} title="Current Holdings" />
            {portfolio.length === 0 ? (
              <Typography color="text.secondary">No holdings yet. Go buy some stocks.</Typography>
            ) : (
              portfolio.map((item, i) => {
                const stock = stocks.find(s => s.symbol === item.symbol);
                const invested = item.avgBuyPrice * item.quantity;
                const currentVal = stock ? (stock.currentPrice * item.quantity) : invested;
                const profit = currentVal - invested;
                const profitPct = invested ? (profit / invested) * 100 : 0;
                const isProfit = profit >= 0;
                return (
                  <Box
                    key={item.id}
                    component={motion.div}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
                    sx={{
                      mb: 1.5, p: 2, borderRadius: 2,
                      bgcolor: COLORS.bg, border: `1px solid ${COLORS.border}`,
                      borderLeft: `3px solid ${isProfit ? COLORS.up : COLORS.down}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography fontWeight={800} variant="h6">
                        {item.symbol}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isProfit ? <TrendingUp sx={{ color: COLORS.up }} /> : <TrendingDown sx={{ color: COLORS.down }} />}
                        <Chip
                          label={`${isProfit ? '+' : ''}${profitPct.toFixed(2)}%`}
                          size="small"
                          sx={{ fontWeight: 800, bgcolor: isProfit ? COLORS.upDim : COLORS.downDim, color: isProfit ? COLORS.up : COLORS.down }}
                        />
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {item.quantity} shares • Avg: ₹{Number(item.avgBuyPrice).toLocaleString('en-IN')}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="body2">
                        Invested: ₹{Number(invested).toLocaleString('en-IN')}
                      </Typography>
                      <Typography variant="body2" fontWeight={800} sx={{ color: isProfit ? COLORS.up : COLORS.down }}>
                        P&L: {isProfit ? '+' : ''}₹{profit.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            component={motion.div}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
            sx={{ p: 3 }}
          >
            <SectionHeader icon={<History fontSize="small" />} title="Transaction History" />
            {transactions.length === 0 ? (
              <Typography color="text.secondary">No transactions yet!</Typography>
            ) : (
              transactions.map((t, i) => {
                const isBuy = t.type === 'BUY';
                return (
                  <Box
                    key={t.id}
                    component={motion.div}
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.04 }}
                    sx={{
                      mb: 1.5, p: 2, borderRadius: 2,
                      bgcolor: COLORS.bg, border: `1px solid ${COLORS.border}`,
                      borderLeft: `3px solid ${isBuy ? COLORS.up : COLORS.down}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography fontWeight={800}>
                        {t.symbol}
                      </Typography>
                      <Chip
                        label={t.type}
                        size="small"
                        sx={{ fontWeight: 800, bgcolor: isBuy ? COLORS.upDim : COLORS.downDim, color: isBuy ? COLORS.up : COLORS.down }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {t.quantity} shares @ ₹{t.price}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="body2" fontWeight={800}>
                        Total: ₹{Number(t.total).toLocaleString('en-IN')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(t.createdAt).toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                  </Box>
                );
              })
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Portfolio;
