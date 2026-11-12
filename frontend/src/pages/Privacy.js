import React from 'react';
import { Typography, Box, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';
import { COLORS } from '../theme';
import LegalLayout from '../components/LegalLayout';

/**
 * Privacy policy.
 *
 * Every statement here describes what the code actually does. Nothing is aspirational:
 * if a claim stops being true (for example if an analytics script is ever added), this
 * page has to change in the same commit.
 */
const Privacy = () => (
  <LegalLayout title="Privacy Policy" updated="7 October 2026">
    <Typography paragraph>
      StockTrading Pro is an educational paper-trading project. It uses virtual money
      only and never processes real payments. This page explains exactly what the
      application stores about you and why.
    </Typography>

    <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>What is stored</Typography>
    <Typography component="ul" sx={{ pl: 3, color: COLORS.textDim }}>
      <li>Your name and email address, supplied when you register.</li>
      <li>
        Your password, stored only as a BCrypt hash. The original password is never
        written to the database, to a log file, or anywhere else.
      </li>
      <li>Your virtual wallet balance, which is simulated currency with no real value.</li>
      <li>
        Your simulated activity: trades, portfolio holdings, option positions and
        watchlist entries.
      </li>
    </Typography>

    <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>Where it is stored</Typography>
    <Typography paragraph>
      All data lives in MySQL databases on the machine running the application. Each
      service owns its own database, so account data and trading data are kept separate.
      Nothing is uploaded to a hosted service, and there is no third-party analytics,
      advertising or tracking script anywhere in this application.
    </Typography>

    <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>Sessions</Typography>
    <Typography paragraph>
      When you sign in, the server issues a session token and stores it in a cookie
      marked HttpOnly. That means browser JavaScript cannot read it, which protects the
      token from being stolen by a cross-site scripting attack. The cookie expires after
      24 hours. Signing out clears it.
    </Typography>

    <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>Logging</Typography>
    <Typography paragraph>
      Server logs record each request with its path, response status, duration and the
      email address of the signed-in user. This exists so a specific user's problem can
      be traced across services when something goes wrong. Logs never contain passwords
      or session tokens.
    </Typography>

    <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>Market data</Typography>
    <Typography paragraph>
      Share prices are fetched from Yahoo Finance. Those requests ask for public market
      data by ticker symbol and carry no information about you.
    </Typography>

    <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>Your data</Typography>
    <Typography paragraph>
      Because this is a self-hosted educational project, whoever runs the server controls
      the database and can read or delete any account directly. If you did not install it
      yourself, ask the person who did to remove your account.
    </Typography>

    <Box sx={{ mt: 4, pt: 2, borderTop: `1px solid ${COLORS.border}` }}>
      <Typography variant="body2" sx={{ color: COLORS.textDim }}>
        This document describes a student project and is not legal advice. See also the{' '}
        <MuiLink component={Link} to="/terms" sx={{ color: COLORS.accent }}>
          Terms and Conditions
        </MuiLink>
        .
      </Typography>
    </Box>
  </LegalLayout>
);

export default Privacy;
