import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { stockService, optionsService } from '../services/api';
import PayoffChart from '../components/PayoffChart';
import { COLORS } from '../theme';
import {
  Container, Paper, Typography, Box, Button, Chip, TextField,
  CircularProgress, Snackbar, Alert, MenuItem,
} from '@mui/material';

const EXPIRIES = [7, 30, 60, 90];

const Options = () => {
  const [stocks, setStocks] = useState([]);
  const [symbol, setSymbol] = useState('');
  const [expiry, setExpiry] = useState(30);
  const [chain, setChain] = useState(null);
  const [loadingChain, setLoadingChain] = useState(false);
  const [selected, setSelected] = useState(null);   // {type, strike}
  const [pricing, setPricing] = useState(null);     // 3-method comparison + greeks
  const [qty, setQty] = useState(1);
  const [positions, setPositions] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const notify = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  useEffect(() => {
    stockService.getAllStocks().then(r => {
      const list = r.data || [];
      setStocks(list);
      if (list.length && !symbol) setSymbol(list[0].symbol);
    }).catch(() => {});
    loadPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChain = useCallback(() => {
    if (!symbol) return;
    setLoadingChain(true);
    setSelected(null);
    setPricing(null);
    optionsService.getChain(symbol, expiry)
      .then(r => setChain(r.data))
      .catch(() => setChain(null))
      .finally(() => setLoadingChain(false));
  }, [symbol, expiry]);

  useEffect(() => { loadChain(); }, [loadChain]);

  const loadPositions = () => {
    optionsService.getPositions().then(r => setPositions(r.data || [])).catch(() => {});
  };

  const selectContract = (type, strike) => {
    setSelected({ type, strike });
    setPricing(null);
    optionsService.priceOption({
      spot: chain.spot, strike, daysToExpiry: expiry, type, volatility: chain.volatility,
    }).then(r => setPricing(r.data)).catch(() => {});
  };

  const buy = () => {
    if (!selected) return;
    optionsService.buyOption({
      symbol, type: selected.type, strike: selected.strike, days: expiry, quantity: Number(qty),
    }).then(r => {
      notify(r.data, 'success');
      loadPositions();
    }).catch(e => {
      const data = e.response?.data;
      notify(typeof data === 'string' && data ? data : 'Buy failed', 'error');
    });
  };

  const closePosition = (id) => {
    optionsService.closePosition(id).then(r => {
      notify(r.data, 'success');
      loadPositions();
    }).catch(e => {
      const data = e.response?.data;
      notify(typeof data === 'string' && data ? data : 'Close failed', 'error');
    });
  };

  const cell = { padding: '8px 10px', fontSize: '0.85rem' };
  const th = { ...cell, color: COLORS.textDim, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="h4" fontWeight={800}>
          Options <span style={{ color: COLORS.accent }}>Desk</span>
        </Typography>
        <Chip size="small" label="Black-Scholes priced" sx={{ bgcolor: 'rgba(34,197,94,0.12)', color: COLORS.accent, fontWeight: 700 }} />
      </Box>
      <Typography variant="body2" sx={{ color: COLORS.textDim, mb: 3 }}>
        Live Call/Put pricing via Black-Scholes (cross-checked with Binomial &amp; Monte Carlo). Premiums use real spot + historical volatility.
      </Typography>

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField select label="Stock" size="small" value={symbol}
          onChange={e => setSymbol(e.target.value)} sx={{ minWidth: 160 }}>
          {stocks.map(s => <MenuItem key={s.symbol} value={s.symbol}>{s.symbol}</MenuItem>)}
        </TextField>
        <TextField select label="Expiry" size="small" value={expiry}
          onChange={e => setExpiry(Number(e.target.value))} sx={{ minWidth: 130 }}>
          {EXPIRIES.map(d => <MenuItem key={d} value={d}>{d} days</MenuItem>)}
        </TextField>
        {chain && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2"><b>Spot</b> ₹{chain.spot}</Typography>
            <Typography variant="body2" sx={{ color: COLORS.textDim }}>
              IV {(chain.volatility * 100).toFixed(1)}% · r {(chain.riskFreeRate * 100).toFixed(0)}%
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Chain table */}
        <Paper sx={{ flex: '1 1 560px', p: 2, overflow: 'auto' }}>
          {loadingChain ? (
            <Box display="flex" justifyContent="center" p={4}><CircularProgress sx={{ color: COLORS.accent }} /></Box>
          ) : !chain ? (
            <Typography color="text.secondary" sx={{ p: 2 }}>No chain data.</Typography>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <th style={{ ...th, color: COLORS.up }}>Call ₹</th>
                  <th style={th}>Call Δ</th>
                  <th style={{ ...th, textAlign: 'center' }}>Strike</th>
                  <th style={th}>Put Δ</th>
                  <th style={{ ...th, color: COLORS.down }}>Put ₹</th>
                </tr>
              </thead>
              <tbody>
                {chain.chain.map(row => {
                  const atm = row.moneyness === 'ATM';
                  const selCall = selected?.type === 'call' && selected?.strike === row.strike;
                  const selPut = selected?.type === 'put' && selected?.strike === row.strike;
                  return (
                    <tr key={row.strike} style={{ borderBottom: `1px solid ${COLORS.border}`, background: atm ? 'rgba(139,92,246,0.06)' : 'transparent' }}>
                      <td style={{ ...cell, cursor: 'pointer', fontWeight: 700, background: selCall ? 'rgba(34,197,94,0.15)' : 'transparent' }}
                          onClick={() => selectContract('call', row.strike)}>
                        ₹{row.call.price}
                      </td>
                      <td style={{ ...cell, color: COLORS.textDim }}>{row.call.delta}</td>
                      <td style={{ ...cell, textAlign: 'center', fontWeight: 800 }}>
                        {row.strike}{atm && <Chip label="ATM" size="small" sx={{ ml: 0.5, height: 16, fontSize: '0.6rem', bgcolor: 'rgba(139,92,246,0.2)', color: '#8b5cf6' }} />}
                      </td>
                      <td style={{ ...cell, color: COLORS.textDim }}>{row.put.delta}</td>
                      <td style={{ ...cell, cursor: 'pointer', fontWeight: 700, background: selPut ? 'rgba(239,68,68,0.15)' : 'transparent' }}
                          onClick={() => selectContract('put', row.strike)}>
                        ₹{row.put.price}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <Typography variant="caption" sx={{ color: COLORS.textDim, mt: 1, display: 'block' }}>
            Click a Call or Put price to price it &amp; trade →
          </Typography>
        </Paper>

        {/* Detail / trade panel */}
        <Box sx={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {selected && (
            <Paper component={motion.div} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                {symbol} {selected.type.toUpperCase()} · K ₹{selected.strike}
              </Typography>
              {!pricing ? (
                <Box display="flex" justifyContent="center" p={2}><CircularProgress size={22} sx={{ color: COLORS.accent }} /></Box>
              ) : (
                <>
                  {/* 3-method comparison */}
                  <Box sx={{ my: 1.5, p: 1.5, borderRadius: 2, bgcolor: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
                    <Typography variant="caption" sx={{ color: COLORS.textDim, fontWeight: 700 }}>PREMIUM (3 methods agree)</Typography>
                    {[['Black-Scholes', pricing.blackScholes], ['Binomial Tree', pricing.binomialTree], ['Monte Carlo', pricing.monteCarlo?.price]].map(([k, v]) => (
                      <Box key={k} display="flex" justifyContent="space-between">
                        <Typography variant="body2" sx={{ color: COLORS.textDim }}>{k}</Typography>
                        <Typography variant="body2" fontWeight={800}>₹{v}</Typography>
                      </Box>
                    ))}
                  </Box>
                  {/* Greeks */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                    {Object.entries(pricing.greeks).map(([g, v]) => (
                      <Chip key={g} size="small" label={`${g[0].toUpperCase()}: ${v}`}
                        title={g} sx={{ bgcolor: COLORS.bg, border: `1px solid ${COLORS.border}`, fontWeight: 700 }} />
                    ))}
                  </Box>
                  {/* Payoff */}
                  <PayoffChart optionType={selected.type.toUpperCase()} strike={selected.strike}
                    premium={pricing.blackScholes} spot={chain.spot} />
                  {/* Buy */}
                  <Box display="flex" gap={1} alignItems="center" sx={{ mt: 1.5 }}>
                    <TextField type="number" size="small" label="Qty" value={qty}
                      onChange={e => setQty(Math.max(1, Number(e.target.value)))} sx={{ width: 90 }} inputProps={{ min: 1 }} />
                    <Typography variant="body2" sx={{ color: COLORS.textDim }}>
                      Cost ≈ ₹{(pricing.blackScholes * qty).toFixed(2)}
                    </Typography>
                  </Box>
                  <Button fullWidth variant="contained" onClick={buy}
                    sx={{ mt: 1.5, py: 1.2, fontWeight: 800,
                      bgcolor: selected.type === 'call' ? COLORS.up : COLORS.down,
                      color: selected.type === 'call' ? '#04210f' : '#fff',
                      '&:hover': { bgcolor: selected.type === 'call' ? '#16a34a' : '#dc2626' } }}>
                    BUY {selected.type.toUpperCase()}
                  </Button>
                </>
              )}
            </Paper>
          )}
        </Box>
      </Box>

      {/* Open positions */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Open Option Positions</Typography>
        {positions.length === 0 ? (
          <Typography color="text.secondary">No option positions yet. Buy a Call or Put above.</Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  {['Symbol', 'Type', 'Strike', 'Qty', 'Paid', 'Now', 'P&L', 'Expiry', ''].map(h => (
                    <th key={h} style={{ ...th, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map(p => {
                  const up = Number(p.pnl) >= 0;
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ ...cell, fontWeight: 700 }}>{p.symbol}</td>
                      <td style={cell}>
                        <Chip size="small" label={p.optionType}
                          sx={{ fontWeight: 700, bgcolor: p.optionType === 'CALL' ? COLORS.upDim : COLORS.downDim, color: p.optionType === 'CALL' ? COLORS.up : COLORS.down }} />
                      </td>
                      <td style={cell}>₹{p.strike}</td>
                      <td style={cell}>{p.quantity}</td>
                      <td style={cell}>₹{p.premiumPaid}</td>
                      <td style={cell}>₹{p.currentPremium}</td>
                      <td style={{ ...cell, fontWeight: 800, color: up ? COLORS.up : COLORS.down }}>
                        {up ? '+' : ''}₹{Number(p.pnl).toFixed(2)}
                      </td>
                      <td style={{ ...cell, color: COLORS.textDim }}>{p.daysToExpiry}d</td>
                      <td style={cell}>
                        <Button size="small" variant="outlined" color="error" onClick={() => closePosition(p.id)}>Close</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        )}
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={3500}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert
          severity={snackbar.severity}
          variant="filled"
          icon={false}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{
            borderRadius: 2,
            fontWeight: 700,
            color: '#ffffff',
            bgcolor: snackbar.severity === 'error' ? '#dc2626'
              : snackbar.severity === 'warning' ? '#d97706' : '#16a34a',
            boxShadow: '0 10px 36px rgba(0,0,0,0.55)',
            '& .MuiAlert-action': { color: '#ffffff' },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Options;
