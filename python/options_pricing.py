"""
================================================================================
 OPTION PRICING ENGINE  —  file: python/options_pricing.py
================================================================================
 This module prices European Call/Put options THREE different ways so the
 results can be compared (they should all agree). Quick map of WHERE each
 method lives (handy if someone asks "where is X implemented?"):

   METHOD 1  Black-Scholes (closed-form)      -> black_scholes()        [PRIMARY/BEST]
   METHOD 2  Binomial Tree (Cox-Ross-Rubinstein) -> binomial_tree()    [numerical check]
   METHOD 3  Monte Carlo simulation           -> monte_carlo()         [statistical check]

 Supporting maths:
   The Greeks (Δ Γ Θ ν ρ)                     -> greeks()
   Historical volatility from prices          -> historical_volatility()

 Inputs used everywhere:
   S     = spot (current) price of the stock
   K     = strike price of the option
   T     = time to expiry IN YEARS  (e.g. 30 days = 30/365)
   r     = annual risk-free interest rate (decimal, e.g. 0.07 = 7%)
   sigma = annual volatility (decimal, e.g. 0.25 = 25%)
================================================================================
"""

import math
from statistics import NormalDist

# Standard normal distribution: N(x) = .cdf, N'(x) = .pdf  (no scipy needed)
_N = NormalDist()


# ==============================================================================
# METHOD 1 — BLACK-SCHOLES (closed-form)            [PRIMARY / BEST for our app]
# Location: python/options_pricing.py -> black_scholes()
# Formula:
#   d1 = [ln(S/K) + (r + σ²/2)·T] / (σ·√T)
#   d2 = d1 − σ·√T
#   Call = S·N(d1) − K·e^(−rT)·N(d2)
#   Put  = K·e^(−rT)·N(−d2) − S·N(−d1)
# ==============================================================================
def black_scholes(S, K, T, r, sigma, option_type="call"):
    if T <= 0 or sigma <= 0:
        # at/after expiry: option is worth its intrinsic value only
        intrinsic = max(S - K, 0.0) if option_type == "call" else max(K - S, 0.0)
        return round(intrinsic, 2)

    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)

    if option_type == "call":
        price = S * _N.cdf(d1) - K * math.exp(-r * T) * _N.cdf(d2)
    else:  # put
        price = K * math.exp(-r * T) * _N.cdf(-d2) - S * _N.cdf(-d1)
    return round(price, 2)


# ==============================================================================
# THE GREEKS — sensitivities of the option price (analytic, from Black-Scholes)
# Location: python/options_pricing.py -> greeks()
#   Delta (Δ) : ∂Price/∂S      — how much price moves per ₹1 move in the stock
#   Gamma (Γ) : ∂²Price/∂S²    — how fast Delta changes
#   Theta (Θ) : ∂Price/∂t      — time decay (per day here)
#   Vega  (ν) : ∂Price/∂σ      — sensitivity to 1% change in volatility
#   Rho   (ρ) : ∂Price/∂r      — sensitivity to 1% change in interest rate
# ==============================================================================
def greeks(S, K, T, r, sigma, option_type="call"):
    if T <= 0 or sigma <= 0:
        return {"delta": 0, "gamma": 0, "theta": 0, "vega": 0, "rho": 0}

    sqrtT = math.sqrt(T)
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * sqrtT)
    d2 = d1 - sigma * sqrtT
    pdf_d1 = _N.pdf(d1)

    gamma = pdf_d1 / (S * sigma * sqrtT)
    vega = S * pdf_d1 * sqrtT / 100.0           # per 1% vol change

    if option_type == "call":
        delta = _N.cdf(d1)
        theta = (-(S * pdf_d1 * sigma) / (2 * sqrtT)
                 - r * K * math.exp(-r * T) * _N.cdf(d2)) / 365.0
        rho = K * T * math.exp(-r * T) * _N.cdf(d2) / 100.0
    else:  # put
        delta = _N.cdf(d1) - 1
        theta = (-(S * pdf_d1 * sigma) / (2 * sqrtT)
                 + r * K * math.exp(-r * T) * _N.cdf(-d2)) / 365.0
        rho = -K * T * math.exp(-r * T) * _N.cdf(-d2) / 100.0

    return {
        "delta": round(delta, 4),
        "gamma": round(gamma, 6),
        "theta": round(theta, 4),   # per day
        "vega": round(vega, 4),     # per 1% vol
        "rho": round(rho, 4),       # per 1% rate
    }


# ==============================================================================
# METHOD 2 — BINOMIAL TREE (Cox-Ross-Rubinstein)        [numerical cross-check]
# Location: python/options_pricing.py -> binomial_tree()
# Idea: split time into N steps; at each step price goes up by u or down by d.
# Price by working BACKWARDS from expiry payoffs (backward induction).
# Converges to Black-Scholes as N grows. Set american=True for early exercise.
# ==============================================================================
def binomial_tree(S, K, T, r, sigma, option_type="call", steps=500, american=False):
    if T <= 0 or sigma <= 0:
        return max(S - K, 0.0) if option_type == "call" else max(K - S, 0.0)

    dt = T / steps
    u = math.exp(sigma * math.sqrt(dt))     # up factor
    d = 1 / u                               # down factor
    p = (math.exp(r * dt) - d) / (u - d)    # risk-neutral up-probability
    disc = math.exp(-r * dt)

    # terminal stock prices and their payoffs
    values = []
    for i in range(steps + 1):
        ST = S * (u ** (steps - i)) * (d ** i)
        values.append(max(ST - K, 0.0) if option_type == "call" else max(K - ST, 0.0))

    # backward induction
    for step in range(steps - 1, -1, -1):
        for i in range(step + 1):
            values[i] = disc * (p * values[i] + (1 - p) * values[i + 1])
            if american:  # allow early exercise
                ST = S * (u ** (step - i)) * (d ** i)
                intrinsic = max(ST - K, 0.0) if option_type == "call" else max(K - ST, 0.0)
                values[i] = max(values[i], intrinsic)

    return round(values[0], 2)


# ==============================================================================
# METHOD 3 — MONTE CARLO simulation                     [statistical cross-check]
# Location: python/options_pricing.py -> monte_carlo()
# Idea: simulate many random final prices using geometric Brownian motion,
#   ST = S·exp[(r − σ²/2)T + σ√T·Z],  Z ~ N(0,1)
# then average the discounted payoffs. Returns price + ± standard error.
# ==============================================================================
def monte_carlo(S, K, T, r, sigma, option_type="call", simulations=100_000):
    if T <= 0 or sigma <= 0:
        return {"price": max(S - K, 0.0) if option_type == "call" else max(K - S, 0.0),
                "std_error": 0.0}

    import random
    drift = (r - 0.5 * sigma ** 2) * T
    vol = sigma * math.sqrt(T)
    disc = math.exp(-r * T)

    payoffs = []
    for _ in range(simulations):
        z = random.gauss(0, 1)
        ST = S * math.exp(drift + vol * z)
        payoffs.append(max(ST - K, 0.0) if option_type == "call" else max(K - ST, 0.0))

    mean_payoff = sum(payoffs) / simulations
    price = disc * mean_payoff
    # standard error of the estimate
    var = sum((pf - mean_payoff) ** 2 for pf in payoffs) / simulations
    std_error = disc * math.sqrt(var / simulations)
    return {"price": round(price, 2), "std_error": round(std_error, 3)}


# ==============================================================================
# HISTORICAL VOLATILITY — estimate σ from past prices
# Location: python/options_pricing.py -> historical_volatility()
# σ_annual = stdev(daily log-returns) × √252   (252 trading days/year)
# ==============================================================================
def historical_volatility(prices):
    if not prices or len(prices) < 2:
        return 0.25  # sensible fallback (25%)
    log_returns = [math.log(prices[i] / prices[i - 1])
                   for i in range(1, len(prices)) if prices[i - 1] > 0]
    if len(log_returns) < 2:
        return 0.25
    mean = sum(log_returns) / len(log_returns)
    var = sum((x - mean) ** 2 for x in log_returns) / (len(log_returns) - 1)
    daily_vol = math.sqrt(var)
    return round(daily_vol * math.sqrt(252), 4)


# ==============================================================================
# CONVENIENCE — price one option every way + the Greeks, in one call
# Location: python/options_pricing.py -> price_all_methods()
# Used by the /options/price endpoint so the UI can show the comparison.
# ==============================================================================
def price_all_methods(S, K, T, r, sigma, option_type="call"):
    return {
        "blackScholes": black_scholes(S, K, T, r, sigma, option_type),
        "binomialTree": binomial_tree(S, K, T, r, sigma, option_type),
        "monteCarlo": monte_carlo(S, K, T, r, sigma, option_type),
        "greeks": greeks(S, K, T, r, sigma, option_type),
        "inputs": {"spot": S, "strike": K, "timeYears": round(T, 4),
                   "rate": r, "volatility": sigma, "type": option_type},
    }
