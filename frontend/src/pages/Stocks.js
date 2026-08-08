import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { stockService, tradeService } from '../services/api';
import marketSocket from '../services/websocket';
import TradingChart from '../components/TradingChart';
import AnimatedPrice from '../components/AnimatedPrice';
import { COLORS } from '../theme';
import {
  Container, Paper, Typography, Box, Button, TextField, Chip,
  CircularProgress, Alert, Snackbar
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

// Chart time ranges → yfinance period + candle interval
const RANGES = {
  '1D': { period: '1d', interval: '5m' },
  '1W': { period: '5d', interval: '15m' },
  '1M': { period: '1mo', interval: '1d' },
  '3M': { period: '3mo', interval: '1d' },
  '1Y': { period: '1y', interval: '1d' },
};

const Stocks = () => {
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [history, setHistory] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [marketStatus, setMarketStatus] = useState(null);
  const [range, setRange] = useState('1D');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Initial REST load for the list, then switch to live WebSocket updates.
  useEffect(() => {
    loadStocks();

    // Market open/closed badge — refresh every 60s
    const loadStatus = () =>
      stockService.getMarketStatus().then(r => setMarketStatus(r.data)).catch(() => {});
    loadStatus();
    const statusInterval = setInterval(loadStatus, 60000);

    const unsubscribe = marketSocket.subscribe('/topic/stocks', (updated) => {
      if (!Array.isArray(updated)) return;
      setStocks(updated);
      // keep the selected stock's header price in sync with the live feed
      setSelectedStock((prev) =>
        prev ? updated.find((s) => s.symbol === prev.symbol) || prev : prev
      );
    });

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, []);

  const loadStocks = async () => {
    try {
      const res = await stockService.getAllStocks();
      setStocks(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = useCallback(async (symbol, { showSpinner = false } = {}) => {
    if (showSpinner) setChartLoading(true);
    try {
      // Real OHLCV from yfinance for the selected time range
      const { period, interval } = RANGES[range];
      const res = await stockService.getOhlcv(symbol, period, interval);
      const candles = (res.data || []).filter(c => c.time && c.open && c.close);
      setHistory(candles);
    } catch (err) {
      console.error(err);
      setHistory([]);
    } finally {
      if (showSpinner) setChartLoading(false);
    }
  }, [range]);

  // Refetch when a stock is selected or the range changes (with spinner),
  // and keep refreshing every 30s while a stock stays selected.
  useEffect(() => {
    if (!selectedStock) return;
    fetchHistory(selectedStock.symbol, { showSpinner: true });
    const interval = setInterval(() => fetchHistory(selectedStock.symbol), 30000);
    return () => clearInterval(interval);
  }, [selectedStock, fetchHistory]);

  const handleSelect = (stock) => {
    setSelectedStock(stock);
  };

  const handleTrade = async (type) => {
    if (!selectedStock || quantity < 1) return;
    try {
      await tradeService.executeTrade({
        symbol: selectedStock.symbol,
        quantity: Number(quantity),
        type,
      });
      setSnackbar({ open: true, message: `${type} order for ${quantity} ${selectedStock.symbol.replace('.BSE', '')} executed!`, severity: 'success' });
      loadStocks();
    } catch (err) {
      const data = err.response?.data;
      setSnackbar({ open: true, message: typeof data === 'string' && data ? data : `${type} failed`, severity: 'error' });
    }
  };

  // Compute AI prediction from actual price history
  const getAIPrediction = () => {
    if (!history || history.length < 10) return null;

    // history items are OHLCV candles now ({open,high,low,close}); use close as the price.
    const prices = history.map(h => h.close ?? h.price).filter(v => v != null && !isNaN(v));
    if (prices.length < 10) return null;
    const latest = prices[prices.length - 1];
    const oldest = prices[0];
    const overallChange = ((latest - oldest) / oldest) * 100;

    // Short-term trend (last 20% of data)
    const shortStart = Math.floor(prices.length * 0.8);
    const shortPrices = prices.slice(shortStart);
    const shortChange = ((shortPrices[shortPrices.length - 1] - shortPrices[0]) / shortPrices[0]) * 100;

    // Volatility
    let sumSqDiff = 0;
    for (let i = 1; i < prices.length; i++) {
      const diff = (prices[i] - prices[i - 1]) / prices[i - 1];
      sumSqDiff += diff * diff;
    }
    const volatility = Math.sqrt(sumSqDiff / (prices.length - 1)) * 100;

    // Determine trend
    let trend, confidence, signal;
    if (shortChange > 0.3 && overallChange > 0) {
      trend = 'Bullish';
      signal = 'BUY';
      confidence = Math.min(92, 60 + Math.abs(shortChange) * 10);
    } else if (shortChange < -0.3 && overallChange < 0) {
      trend = 'Bearish';
      signal = 'SELL';
      confidence = Math.min(92, 60 + Math.abs(shortChange) * 10);
    } else if (Math.abs(shortChange) < 0.15) {
      trend = 'Sideways';
      signal = 'HOLD';
      confidence = 50 + Math.random() * 15;
    } else {
      trend = shortChange > 0 ? 'Mildly Bullish' : 'Mildly Bearish';
      signal = shortChange > 0 ? 'BUY' : 'SELL';
      confidence = 50 + Math.abs(shortChange) * 8;
    }

    return {
      trend,
      signal,
      confidence: Math.min(95, confidence).toFixed(0),
      overallChange: overallChange.toFixed(2),
      shortChange: shortChange.toFixed(2),
      volatility: volatility.toFixed(3),
    };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  const prediction = selectedStock ? getAIPrediction() : null;

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Markets
        </Typography>
        {marketStatus && (
          <Chip
            size="small"
            label={`NSE ${marketStatus.status}`}
            sx={{
              fontWeight: 'bold',
              bgcolor: marketStatus.isOpen ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
              color: marketStatus.isOpen ? '#16a34a' : '#dc2626',
              border: `1px solid ${marketStatus.isOpen ? '#22c55e' : '#ef4444'}`,
            }}
          />
        )}
      </Box>

      {/* STOCK LIST */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        {stocks.map((stock, i) => {
          const isUp = stock.changePercent >= 0;
          const isSelected = selectedStock?.symbol === stock.symbol;
          return (
            <Paper
              key={stock.symbol}
              component={motion.div}
              onClick={() => handleSelect(stock)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
              whileHover={{ y: -4 }}
              sx={{
                p: 2,
                cursor: 'pointer',
                minWidth: 160,
                flex: '1 1 160px',
                maxWidth: 220,
                border: `1px solid ${isSelected ? COLORS.accent : COLORS.border}`,
                boxShadow: isSelected ? `0 0 0 1px ${COLORS.accent}, 0 8px 30px rgba(34,197,94,0.15)` : 'none',
                bgcolor: isSelected ? 'rgba(34,197,94,0.06)' : COLORS.surface,
                '&:hover': { borderColor: 'rgba(34,197,94,0.5)' },
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={800}>
                  {stock.symbol.replace('.BSE', '')}
                </Typography>
                {isUp
                  ? <TrendingUp sx={{ color: COLORS.up, fontSize: 20 }} />
                  : <TrendingDown sx={{ color: COLORS.down, fontSize: 20 }} />}
              </Box>
              <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5 }}>
                <AnimatedPrice value={stock.currentPrice} />
              </Typography>
              <Chip
                size="small"
                label={`${isUp ? '+' : ''}${Number(stock.changePercent).toFixed(2)}%`}
                sx={{
                  mt: 0.5,
                  fontWeight: 800,
                  bgcolor: isUp ? COLORS.upDim : COLORS.downDim,
                  color: isUp ? COLORS.up : COLORS.down,
                }}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {stock.companyName}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      {/* SELECTED STOCK DETAIL */}
      {selectedStock && (
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* CHART AREA */}
          <Paper
            component={motion.div}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            sx={{
              flex: '1 1 600px',
              overflow: 'hidden',
            }}
          >
            {/* Stock header */}
            <Box sx={{ p: 2.5, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h5" fontWeight={800}>
                  {selectedStock.symbol.replace('.BSE', '')}
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    {selectedStock.companyName}
                  </Typography>
                </Typography>
                <Box display="flex" alignItems="center" gap={1.5} sx={{ mt: 0.5 }}>
                  <Typography variant="h4" fontWeight={800} className="glow-green">
                    <AnimatedPrice value={selectedStock.currentPrice} />
                  </Typography>
                  <Chip
                    size="small"
                    icon={selectedStock.changePercent >= 0 ? <TrendingUp /> : <TrendingDown />}
                    label={`${selectedStock.changePercent >= 0 ? '+' : ''}${Number(selectedStock.changePercent).toFixed(2)}%`}
                    color={selectedStock.changePercent >= 0 ? 'success' : 'error'}
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>
              </Box>
              {/* Time-range selector */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {Object.keys(RANGES).map((r) => (
                  <Button
                    key={r}
                    size="small"
                    onClick={() => setRange(r)}
                    sx={{
                      minWidth: 40, px: 1, fontWeight: 800,
                      color: range === r ? COLORS.accent : COLORS.textDim,
                      bgcolor: range === r ? 'rgba(34,197,94,0.12)' : 'transparent',
                      border: `1px solid ${range === r ? 'rgba(34,197,94,0.4)' : COLORS.border}`,
                    }}
                  >
                    {r}
                  </Button>
                ))}
              </Box>
            </Box>

            {/* Chart */}
            <Box sx={{ bgcolor: '#131722', p: 0 }}>
              {chartLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height={420}>
                  <CircularProgress sx={{ color: '#22c55e' }} />
                </Box>
              ) : !history || history.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" height={420}>
                  <Typography color="#9ca3af">No chart data available</Typography>
                </Box>
              ) : (
                <TradingChart data={history} height={420} />
              )}
            </Box>
          </Paper>

          {/* TRADE PANEL + AI */}
          <Box sx={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Trade Card */}
            <Paper
              component={motion.div}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35 }}
              sx={{
                p: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                  background: `linear-gradient(90deg, ${COLORS.up}, #06b6d4)`,
                },
              }}
            >
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                Place Order
              </Typography>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                inputProps={{ min: 1 }}
                sx={{ mb: 2 }}
              />
              <Box sx={{
                mb: 2, p: 1.5, borderRadius: 2,
                bgcolor: COLORS.bg, border: `1px solid ${COLORS.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <Typography variant="body2" sx={{ color: COLORS.textDim }}>Estimated</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: COLORS.accent }}>
                  ₹{(selectedStock.currentPrice * quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Box display="flex" gap={1.5}>
                <Button
                  fullWidth variant="contained"
                  component={motion.button} whileTap={{ scale: 0.96 }}
                  onClick={() => handleTrade('BUY')}
                  sx={{
                    py: 1.3, fontWeight: 800, fontSize: '1rem',
                    bgcolor: COLORS.up, color: '#04210f',
                    boxShadow: '0 4px 18px rgba(34,197,94,0.4)',
                    '&:hover': { bgcolor: '#16a34a', boxShadow: '0 6px 24px rgba(34,197,94,0.6)' },
                  }}
                >
                  BUY
                </Button>
                <Button
                  fullWidth variant="contained"
                  component={motion.button} whileTap={{ scale: 0.96 }}
                  onClick={() => handleTrade('SELL')}
                  sx={{
                    py: 1.3, fontWeight: 800, fontSize: '1rem',
                    bgcolor: COLORS.down, color: '#fff',
                    boxShadow: '0 4px 18px rgba(239,68,68,0.4)',
                    '&:hover': { bgcolor: '#dc2626', boxShadow: '0 6px 24px rgba(239,68,68,0.6)' },
                  }}
                >
                  SELL
                </Button>
              </Box>
            </Paper>

            {/* AI Prediction Card */}
            <Paper
              elevation={3}
              sx={{
                p: 3,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #131722 0%, #1e293b 100%)',
                color: '#fff',
              }}
            >
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                AI Prediction
              </Typography>
              {prediction ? (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 0.5 }}>Trend</Typography>
                    <Chip
                      label={prediction.trend}
                      sx={{
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        bgcolor: prediction.trend.includes('Bullish')
                          ? 'rgba(34,197,94,0.2)'
                          : prediction.trend.includes('Bearish')
                            ? 'rgba(239,68,68,0.2)'
                            : 'rgba(234,179,8,0.2)',
                        color: prediction.trend.includes('Bullish')
                          ? '#4ade80'
                          : prediction.trend.includes('Bearish')
                            ? '#f87171'
                            : '#fbbf24',
                      }}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 0.5 }}>Signal</Typography>
                    <Chip
                      label={prediction.signal}
                      size="small"
                      sx={{
                        fontWeight: 'bold',
                        bgcolor: prediction.signal === 'BUY'
                          ? '#22c55e'
                          : prediction.signal === 'SELL'
                            ? '#ef4444'
                            : '#eab308',
                        color: '#fff',
                      }}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 0.5 }}>Confidence</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ flex: 1, height: 6, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                        <Box
                          sx={{
                            width: `${prediction.confidence}%`,
                            height: '100%',
                            borderRadius: 3,
                            bgcolor: Number(prediction.confidence) > 70 ? '#22c55e' : '#eab308',
                          }}
                        />
                      </Box>
                      <Typography variant="body2" fontWeight="bold">{prediction.confidence}%</Typography>
                    </Box>
                  </Box>

                  <Box display="flex" gap={2}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#9ca3af' }}>Overall</Typography>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={prediction.overallChange >= 0 ? '#4ade80' : '#f87171'}
                      >
                        {prediction.overallChange >= 0 ? '+' : ''}{prediction.overallChange}%
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#9ca3af' }}>Recent</Typography>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={prediction.shortChange >= 0 ? '#4ade80' : '#f87171'}
                      >
                        {prediction.shortChange >= 0 ? '+' : ''}{prediction.shortChange}%
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#9ca3af' }}>Volatility</Typography>
                      <Typography variant="body2" fontWeight="bold" color="#fbbf24">
                        {prediction.volatility}%
                      </Typography>
                    </Box>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                  Not enough data for prediction
                </Typography>
              )}
            </Paper>

            {/* Stock Stats */}
            <Paper
              component={motion.div}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              sx={{ p: 3 }}
            >
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                Stock Info
              </Typography>
              <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Previous Close</Typography>
                <Typography variant="body2" fontWeight="bold">
                  ₹{Number(selectedStock.previousPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Change</Typography>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  color={selectedStock.changePercent >= 0 ? 'success.main' : 'error.main'}
                >
                  ₹{(selectedStock.currentPrice - selectedStock.previousPrice).toFixed(2)}
                </Typography>
              </Box>
              {history.length > 0 && (
                <>
                  <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Day High</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      ₹{Math.max(...history.map(h => h.high ?? h.close ?? h.price)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Day Low</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      ₹{Math.min(...history.map(h => h.low ?? h.close ?? h.price)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </>
              )}
            </Paper>
          </Box>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Stocks;
