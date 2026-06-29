import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { userService } from '../services/api';
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, IconButton, Box, Typography, Chip, Stack,
} from '@mui/material';
import {
  Add, QrCode2, CreditCard, Payment, AccountBalance, Lock,
} from '@mui/icons-material';
import { COLORS } from '../theme';

const METHODS = [
  { id: 'upi', label: 'UPI', sub: 'GPay · PhonePe · Paytm', icon: <QrCode2 /> },
  { id: 'credit', label: 'Credit Card', sub: 'Visa · Mastercard', icon: <CreditCard /> },
  { id: 'debit', label: 'Debit Card', sub: 'All banks', icon: <Payment /> },
  { id: 'netbanking', label: 'Net Banking', sub: '50+ banks', icon: <AccountBalance /> },
];

const QUICK = [1000, 5000, 10000, 50000];

const AddFunds = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeposit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) { setError('Enter a valid amount'); return; }
    if (value > 1000000) { setError('Maximum deposit is ₹10,00,000'); return; }
    if (!method) { setError('Select a payment method'); return; }

    setLoading(true);
    setError('');
    try {
      // DEMO: payment method is illustrative only — credits the virtual wallet.
      const res = await userService.deposit(value);
      onSuccess(res.data.newBalance);
      setOpen(false);
      setAmount('');
    } catch (err) {
      setError(err.response?.data || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        sx={{
          bgcolor: 'rgba(34,197,94,0.15)',
          color: '#22c55e',
          border: '1px solid rgba(34,197,94,0.4)',
          '&:hover': { bgcolor: 'rgba(34,197,94,0.28)' },
        }}
      >
        <Add />
      </IconButton>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Funds</DialogTitle>
        <DialogContent>
          {/* Demo-mode banner — keeps it honest: no real money */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1, mb: 2, p: 1.2, borderRadius: 2,
            bgcolor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)',
          }}>
            <Lock sx={{ fontSize: 18, color: '#f59e0b' }} />
            <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 700 }}>
              Demo / Test mode — no real money is charged
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            autoFocus fullWidth label="Amount (₹)" type="number"
            value={amount} onChange={(e) => setAmount(e.target.value)}
            inputProps={{ min: 1, max: 1000000 }}
          />

          <Stack direction="row" spacing={1} sx={{ mt: 1.5, mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
            {QUICK.map((q) => (
              <Chip
                key={q}
                label={`₹${q.toLocaleString('en-IN')}`}
                onClick={() => setAmount(String(q))}
                sx={{
                  fontWeight: 700, cursor: 'pointer',
                  bgcolor: Number(amount) === q ? 'rgba(34,197,94,0.18)' : COLORS.bg,
                  color: Number(amount) === q ? COLORS.accent : COLORS.textDim,
                  border: `1px solid ${Number(amount) === q ? COLORS.accent : COLORS.border}`,
                }}
              />
            ))}
          </Stack>

          <Typography variant="body2" sx={{ color: COLORS.textDim, mb: 1.2, fontWeight: 700 }}>
            Payment method
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.2 }}>
            {METHODS.map((m) => {
              const selected = method === m.id;
              return (
                <Box
                  key={m.id}
                  component={motion.div}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setMethod(m.id)}
                  sx={{
                    p: 1.5, borderRadius: 2, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 1.2,
                    bgcolor: selected ? 'rgba(34,197,94,0.10)' : COLORS.bg,
                    border: `1px solid ${selected ? COLORS.accent : COLORS.border}`,
                    transition: 'all .15s ease',
                  }}
                >
                  <Box sx={{ color: selected ? COLORS.accent : COLORS.textDim, display: 'flex' }}>
                    {m.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>{m.label}</Typography>
                    <Typography variant="caption" sx={{ color: COLORS.textDim }} noWrap>{m.sub}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeposit} variant="contained" disabled={loading}
            component={motion.button} whileTap={{ scale: 0.96 }}
            sx={{ px: 3 }}
          >
            {loading ? 'Processing...' : `Pay ${amount ? '₹' + Number(amount).toLocaleString('en-IN') : ''}`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddFunds;
