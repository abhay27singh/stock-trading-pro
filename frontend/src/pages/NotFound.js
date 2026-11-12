import React from 'react';
import { Container, Paper, Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme';

/**
 * Custom 404.
 *
 * The catch-all route used to redirect silently to the login screen, which was
 * confusing in two ways: a signed-in user who mistyped a URL was bounced to a login
 * page they did not need, and nobody was told the address was wrong. This says what
 * happened and offers one clear way back, chosen by whether you are signed in.
 */
const NotFound = () => {
  const { user } = useAuth();
  const home = user ? '/dashboard' : '/login';

  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Paper sx={{ p: 5, textAlign: 'center' }}>
        <Typography variant="h2" sx={{ fontWeight: 800, color: COLORS.accent, mb: 1 }}>
          404
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
          Page not found
        </Typography>
        <Typography sx={{ color: COLORS.textDim, mb: 4 }}>
          That address does not match any page in this application. It may have been
          mistyped, or the page may have moved.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button component={Link} to={home} variant="contained">
            {user ? 'Back to dashboard' : 'Go to sign in'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default NotFound;
