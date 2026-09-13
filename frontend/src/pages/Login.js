import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  Container, Box, TextField, Button, Typography,
  Paper, Alert, CircularProgress
} from '@mui/material';
import { COLORS } from '../theme';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      className="animated-bg"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* drifting glow blobs */}
      <Box className="blob" sx={{ width: 320, height: 320, top: '-60px', left: '-40px', background: COLORS.up, animation: 'floatBlob 16s ease-in-out infinite' }} />
      <Box className="blob" sx={{ width: 280, height: 280, bottom: '-80px', right: '-30px', background: '#06b6d4', animation: 'floatBlob 20s ease-in-out infinite reverse' }} />

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          component={motion.div}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          elevation={0}
          sx={{
            p: 4,
            bgcolor: 'rgba(17,23,34,0.75)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${COLORS.border}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <Typography variant="h4" align="center" fontWeight={800} sx={{ mb: 0.5 }}>
            <span style={{ color: COLORS.accent }}>▲</span> Stock
            <span style={{ color: COLORS.accent }}>Trading</span>
            <Typography component="span" sx={{ color: COLORS.textDim, fontSize: 14, ml: 0.5 }}>PRO</Typography>
          </Typography>
          <Typography variant="body2" align="center" sx={{ mb: 3, color: COLORS.textDim }}>
            Login to your trading account
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth label="Email" type="email" size="medium"
              value={email} onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }} required
            />
            <TextField
              fullWidth label="Password" type="password" size="medium"
              value={password} onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }} required
            />
            <Button
              fullWidth variant="contained" type="submit"
              size="large" disabled={loading}
              sx={{ mb: 2, py: 1.5, fontSize: '1rem' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Login'}
            </Button>
          </form>

          <Typography align="center" sx={{ color: COLORS.textDim }}>
            Don't you have an account?{' '}
            <Link to="/register" style={{ color: COLORS.accent, fontWeight: 700 }}>
              Register here
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
