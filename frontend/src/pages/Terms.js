import React from 'react';
import { Typography, Box, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';
import { COLORS } from '../theme';
import LegalLayout from '../components/LegalLayout';

/** Terms of use. Deliberately blunt about what this is and is not. */
const Terms = () => (
  <LegalLayout title="Terms and Conditions" updated="7 October 2026">
    <Typography paragraph>
      StockTrading Pro is an educational simulator built as a student project. By using
      it you accept the terms below.
    </Typography>

    <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>No real money</Typography>
    <Typography paragraph>
      Every balance, trade and option position in this application is simulated. The
      wallet holds virtual currency with no value and cannot be withdrawn, transferred or
      exchanged. The deposit screen credits virtual funds instantly and takes no payment
      details. No real transaction ever occurs.
    </Typography>

    <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>Not a broker, not advice</Typography>
    <Typography paragraph>
      This is not a brokerage and is not registered with SEBI or any other financial
      regulator. Nothing shown here is investment advice or a recommendation to buy or
      sell anything. The prediction and option pricing features are textbook numerical
      methods applied to historical prices. They are teaching tools, not forecasts, and
      should not inform a real investment decision.
    </Typography>

    <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>Accuracy of data</Typography>
    <Typography paragraph>
      Prices come from a free public source and may be delayed, incomplete or wrong. Data
      is unavailable when the market is closed. Option premiums are calculated from a
      Black-Scholes model using historical volatility, so they will not match the price of
      any real contract.
    </Typography>

    <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>Availability and your data</Typography>
    <Typography paragraph>
      The service is provided as is, with no guarantee of uptime, accuracy or data
      retention. It runs locally and may be stopped, reset or have its database cleared at
      any time, which would delete accounts and simulated positions without notice.
    </Typography>

    <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>Acceptable use</Typography>
    <Typography paragraph>
      Do not use this application to attempt to gain access to accounts that are not
      yours, to overload the service, or to present its simulated results as real trading
      performance.
    </Typography>

    <Box sx={{ mt: 4, pt: 2, borderTop: `1px solid ${COLORS.border}` }}>
      <Typography variant="body2" sx={{ color: COLORS.textDim }}>
        This document describes a student project and is not legal advice. See also the{' '}
        <MuiLink component={Link} to="/privacy" sx={{ color: COLORS.accent }}>
          Privacy Policy
        </MuiLink>
        .
      </Typography>
    </Box>
  </LegalLayout>
);

export default Terms;
