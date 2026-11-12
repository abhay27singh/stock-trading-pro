import React from 'react';
import { Box, Container, Typography, Link as MuiLink, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import { COLORS } from '../theme';

/**
 * Site footer.
 *
 * The year is computed at render time rather than hardcoded, so it cannot go stale on
 * 1 January the way a literal would.
 */
const Footer = () => (
  <Box
    component="footer"
    sx={{
      mt: 'auto',
      py: 3,
      borderTop: `1px solid ${COLORS.border}`,
      bgcolor: COLORS.surface,
    }}
  >
    <Container maxWidth="lg">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.5, sm: 3 }}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
        }}
      >
        <Typography variant="body2" sx={{ color: COLORS.textDim }}>
          &copy; {new Date().getFullYear()} StockTrading Pro. Educational simulator using
          virtual money.
        </Typography>
        <Stack direction="row" spacing={3}>
          <MuiLink component={Link} to="/privacy" variant="body2"
                   sx={{ color: COLORS.textDim, '&:hover': { color: COLORS.accent } }}>
            Privacy Policy
          </MuiLink>
          <MuiLink component={Link} to="/terms" variant="body2"
                   sx={{ color: COLORS.textDim, '&:hover': { color: COLORS.accent } }}>
            Terms and Conditions
          </MuiLink>
        </Stack>
      </Stack>
    </Container>
  </Box>
);

export default Footer;
