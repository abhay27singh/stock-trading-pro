import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminService } from '../services/api';
import { COLORS } from '../theme';
import {
  Container, Paper, Typography, Box, Tabs, Tab, Button, TextField,
  CircularProgress, Chip, Alert, Snackbar, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Checkbox, Autocomplete,
} from '@mui/material';
import NSE_STOCKS from '../data/nseStocks';
import {
  People, TrendingUp, ShowChart, BarChart,
  Delete, Edit, Add,
} from '@mui/icons-material';

// shared dark table styles
const thStyle = { padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.8rem', color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: '0.5px' };
const headRow = { background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` };
const bodyRow = { borderBottom: `1px solid ${COLORS.border}` };

// ─── STATS TAB ───
const StatsTab = ({ stats }) => {
  if (!stats) return <CircularProgress />;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, color: COLORS.accent, icon: <People /> },
    { label: 'Total Stocks', value: stats.totalStocks, color: '#06b6d4', icon: <ShowChart /> },
    { label: 'Total Trades', value: stats.totalTransactions, color: '#8b5cf6', icon: <TrendingUp /> },
    { label: 'Trading Volume', value: `₹${Number(stats.totalVolume || 0).toLocaleString('en-IN')}`, color: '#f59e0b', icon: <BarChart /> },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        {cards.map((card, i) => (
          <Paper
            key={i}
            component={motion.div}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.35 }}
            whileHover={{ y: -4 }}
            sx={{
              p: 3, flex: '1 1 200px', minWidth: 200,
              position: 'relative', overflow: 'hidden',
              borderColor: `${card.color}55`,
              boxShadow: `0 8px 30px ${card.color}22`,
              '&::before': {
                content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                background: `linear-gradient(90deg, ${card.color}, transparent)`,
              },
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box sx={{
                width: 44, height: 44, borderRadius: 2, color: card.color,
                bgcolor: `${card.color}1f`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{card.icon}</Box>
              <Box>
                <Typography variant="body2" sx={{ color: COLORS.textDim }}>{card.label}</Typography>
                <Typography variant="h5" fontWeight={800}>{card.value}</Typography>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, flex: '1 1 300px' }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Trade Breakdown</Typography>
          <Box display="flex" gap={3}>
            <Box>
              <Typography variant="body2" color="text.secondary">Buy Orders</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">{stats.buyCount || 0}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Sell Orders</Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">{stats.sellCount || 0}</Typography>
            </Box>
          </Box>
        </Paper>

        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, flex: '1 1 300px' }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Platform Overview</Typography>
          <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">Total User Balances</Typography>
            <Typography variant="body2" fontWeight="bold">
              ₹{Number(stats.totalUserBalance || 0).toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Most Traded Stock</Typography>
            <Chip label={stats.mostTradedStock || 'N/A'} size="small" color="primary" />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

// ─── USERS TAB ───
const UsersTab = ({ users, onRefresh, showSnackbar }) => {
  const [selected, setSelected] = useState([]);
  if (!users) return <CircularProgress />;

  // Only non-admin users can be selected/deleted
  const deletableIds = users.filter(u => (u.role || 'USER') !== 'ADMIN').map(u => u.id);
  const allSelected = deletableIds.length > 0 && selected.length === deletableIds.length;

  const toggleOne = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(allSelected ? [] : deletableIds);

  const deleteIds = async (ids, label) => {
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    let ok = 0, fail = 0;
    for (const id of ids) {
      try { await adminService.deleteUser(id); ok++; }
      catch { fail++; }
    }
    showSnackbar(`${ok} user(s) deleted${fail ? `, ${fail} failed` : ''}`, fail ? 'warning' : 'success');
    setSelected([]);
    onRefresh();
  };

  return (
    <Paper elevation={2} sx={{ overflow: 'hidden' }}>
      {selected.length > 0 && (
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px solid ${COLORS.border}` }}>
          <Typography variant="body2" fontWeight={700}>{selected.length} selected</Typography>
          <Button
            size="small" variant="contained" color="error" startIcon={<Delete />}
            onClick={() => deleteIds(selected, `${selected.length} selected user(s)`)}
          >
            Delete Selected
          </Button>
        </Box>
      )}
      <Box sx={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={headRow}>
              <th style={thStyle}>
                <Checkbox size="small" checked={allSelected}
                  indeterminate={selected.length > 0 && !allSelected}
                  onChange={toggleAll} disabled={deletableIds.length === 0} />
              </th>
              {['ID', 'Name', 'Email', 'Role', 'Balance', 'Stocks Owned', 'Joined', 'Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const role = user.role || 'USER';
              const isAdmin = role === 'ADMIN';
              return (
                <tr key={user.id} style={bodyRow}>
                  <td style={{ padding: '4px 16px' }}>
                    <Checkbox size="small" disabled={isAdmin}
                      checked={selected.includes(user.id)}
                      onChange={() => toggleOne(user.id)} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>{user.id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{user.name}</td>
                  <td style={{ padding: '12px 16px' }}>{user.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <Chip label={role} size="small"
                      color={isAdmin ? 'error' : 'primary'}
                      variant={isAdmin ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 'bold' }} />
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    ₹{Number(user.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{user.portfolioCount}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#8b98a9' }}>
                    {new Date(user.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {!isAdmin && (
                      <IconButton size="small" color="error"
                        onClick={() => deleteIds([user.id], `user "${user.name}"`)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>
    </Paper>
  );
};

// ─── TRADES TAB ───
const TradesTab = ({ trades }) => {
  if (!trades) return <CircularProgress />;

  return (
    <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={headRow}>
              {['ID', 'User', 'Stock', 'Type', 'Qty', 'Price', 'Total', 'Date'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#8b98a9' }}>No trades yet</td></tr>
            ) : trades.map(trade => (
              <tr key={trade.id} style={bodyRow}>
                <td style={{ padding: '12px 16px' }}>{trade.id}</td>
                <td style={{ padding: '12px 16px' }}>{trade.userEmail}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                  {trade.symbol}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Chip label={trade.type} size="small"
                    color={trade.type === 'BUY' ? 'success' : 'error'}
                    sx={{ fontWeight: 'bold' }} />
                </td>
                <td style={{ padding: '12px 16px' }}>{trade.quantity}</td>
                <td style={{ padding: '12px 16px' }}>₹{Number(trade.price).toLocaleString('en-IN')}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                  ₹{Number(trade.total).toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#8b98a9' }}>
                  {new Date(trade.createdAt).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Paper>
  );
};

// ─── STOCKS TAB ───
const StocksTab = ({ stocks, onRefresh, showSnackbar }) => {
  const [addOpen, setAddOpen] = useState(false);
  const [editStock, setEditStock] = useState(null);
  const [form, setForm] = useState({ symbol: '', companyName: '', currentPrice: '' });
  const [picked, setPicked] = useState([]);   // NSE catalog selections to add

  if (!stocks) return <CircularProgress />;

  // Catalog minus the symbols already in the system
  const existing = new Set(stocks.map(s => s.symbol.toUpperCase()));
  const available = NSE_STOCKS.filter(s => !existing.has(s.symbol.toUpperCase()));

  const handleAddSelected = async () => {
    if (picked.length === 0) { showSnackbar('Select at least one stock', 'warning'); return; }
    let ok = 0, fail = 0;
    for (const s of picked) {
      // each item is a catalog object {symbol,name} or a free-typed string
      const symbol = (typeof s === 'string' ? s : s.symbol).toUpperCase().trim();
      const companyName = typeof s === 'string' ? symbol : s.name;
      try {
        // placeholder price (1) satisfies validation; live yfinance price overwrites it in ~10s
        await adminService.addStock({ symbol, companyName, currentPrice: 1 });
        ok++;
      } catch { fail++; }
    }
    showSnackbar(`${ok} stock(s) added${fail ? `, ${fail} failed` : ''} — live prices load shortly`,
      fail ? 'warning' : 'success');
    setPicked([]);
    setAddOpen(false);
    onRefresh();
  };

  const handleEdit = async () => {
    try {
      await adminService.updateStock(editStock.id, {
        companyName: form.companyName,
        currentPrice: Number(form.currentPrice),
      });
      showSnackbar('Stock updated successfully', 'success');
      setEditStock(null);
      onRefresh();
    } catch (err) {
      showSnackbar(err.response?.data || 'Failed to update stock', 'error');
    }
  };

  const handleDelete = async (id, symbol) => {
    if (!window.confirm(`Delete ${symbol}? This cannot be undone.`)) return;
    try {
      await adminService.deleteStock(id);
      showSnackbar(`${symbol} deleted`, 'success');
      onRefresh();
    } catch (err) {
      showSnackbar(err.response?.data || 'Failed to delete stock', 'error');
    }
  };

  return (
    <>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">Manage Stocks ({stocks.length})</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => {
          setForm({ symbol: '', companyName: '', currentPrice: '' });
          setAddOpen(true);
        }}>
          Add Stock
        </Button>
      </Box>

      <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={headRow}>
                {['ID', 'Symbol', 'Company', 'Current Price', 'Change %', 'Actions'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stocks.map(stock => (
                <tr key={stock.id} style={bodyRow}>
                  <td style={{ padding: '12px 16px' }}>{stock.id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{stock.symbol}</td>
                  <td style={{ padding: '12px 16px' }}>{stock.companyName}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    ₹{Number(stock.currentPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Chip
                      label={`${stock.changePercent >= 0 ? '+' : ''}${Number(stock.changePercent).toFixed(2)}%`}
                      size="small"
                      color={stock.changePercent >= 0 ? 'success' : 'error'}
                    />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <IconButton size="small" color="primary" onClick={() => {
                      setEditStock(stock);
                      setForm({ symbol: stock.symbol, companyName: stock.companyName, currentPrice: stock.currentPrice });
                    }}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(stock.id, stock.symbol)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Paper>

      {/* Add Stocks Dialog — pick from the NSE catalog (multi-select) */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Add NSE Stocks</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(34,197,94,0.08)', border: `1px solid ${COLORS.border}` }}>
            <Typography variant="caption" sx={{ color: COLORS.textDim }}>
              Pick one or more NSE stocks and add them in one go. Live prices load from yfinance
              within ~10s. Not in the list? Just type the NSE symbol and press Enter.
            </Typography>
          </Box>
          <Autocomplete
            multiple
            freeSolo
            options={available}
            value={picked}
            onChange={(e, v) => setPicked(v)}
            getOptionLabel={(o) => (typeof o === 'string' ? o : `${o.symbol} — ${o.name}`)}
            isOptionEqualToValue={(o, v) => (o.symbol || o) === (v.symbol || v)}
            renderInput={(params) => (
              <TextField {...params} label="Search NSE stocks" placeholder="e.g. MARUTI, AXISBANK…" autoFocus />
            )}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setPicked([]); setAddOpen(false); }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddSelected} disabled={picked.length === 0}>
            Add {picked.length > 0 ? `${picked.length} Stock(s)` : ''}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Stock Dialog */}
      <Dialog open={!!editStock} onClose={() => setEditStock(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit {editStock?.symbol}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Company Name" value={form.companyName}
            onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} sx={{ mt: 1, mb: 2 }} />
          <TextField fullWidth label="Price" type="number" value={form.currentPrice}
            onChange={e => setForm(f => ({ ...f, currentPrice: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditStock(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleEdit}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ─── MAIN ADMIN PAGE ───
const Admin = () => {
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [trades, setTrades] = useState(null);
  const [stocks, setStocks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity) => setSnackbar({ open: true, message, severity });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, tradesRes, stocksRes] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers(),
        adminService.getTrades(),
        adminService.getStocks(),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setTrades(tradesRes.data);
      setStocks(stocksRes.data);
    } catch (err) {
      console.error(err);
      showSnackbar('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Admin Dashboard</Typography>
        <Button variant="outlined" onClick={fetchData}>Refresh</Button>
      </Box>

      <Paper elevation={1} sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth"
          sx={{ borderBottom: `1px solid ` }}>
          <Tab icon={<BarChart />} label="Statistics" iconPosition="start" />
          <Tab icon={<People />} label="Users" iconPosition="start" />
          <Tab icon={<TrendingUp />} label="Trades" iconPosition="start" />
          <Tab icon={<ShowChart />} label="Stocks" iconPosition="start" />
        </Tabs>
      </Paper>

      {tab === 0 && <StatsTab stats={stats} />}
      {tab === 1 && <UsersTab users={users} onRefresh={fetchData} showSnackbar={showSnackbar} />}
      {tab === 2 && <TradesTab trades={trades} />}
      {tab === 3 && <StocksTab stocks={stocks} onRefresh={fetchData} showSnackbar={showSnackbar} />}

      <Snackbar open={snackbar.open} autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled"
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Admin;
