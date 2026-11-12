import React from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';
import { COLORS } from '../theme';

/**
 * Shared frame for the policy pages, so Privacy and Terms stay visually identical and a
 * change to one does not quietly drift from the other.
 *
 * These pages are reachable without signing in, because someone deciding whether to
 * register needs to read them first.
 */
const LegalLayout = ({ title, updated, children }) => (
  <Container maxWidth="md" sx={{ py: 6 }}>
    <Paper sx={{ p: { xs: 3, md: 5 } }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: COLORS.textDim, mb: 4 }}>
        Last updated: {updated}
      </Typography>
      <Box sx={{ '& p': { color: COLORS.textDim }, '& li': { mb: 1 } }}>
        {children}
      </Box>
    </Paper>
  </Container>
);

export default LegalLayout;
