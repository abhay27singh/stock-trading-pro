from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np

import logging
import os
import time
import traceback

import market_data
import options_pricing  # Phase 4: option pricing engine (Black-Scholes + Binomial + Monte Carlo)

app = Flask(__name__)
# Restrict CORS to configured browser origins instead of allowing every origin.
_cors_origins = [o.strip() for o in os.environ.get(
    "CORS_ALLOWED_ORIGINS", "http://localhost:3001").split(",") if o.strip()]
CORS(app, origins=_cors_origins)

# Annual risk-free interest rate used for option pricing (India ~7%)
RISK_FREE_RATE = 0.07

# Most recent points fed to Newton's divided-difference interpolation. The polynomial
# degree is one less than this, and extrapolating a high-degree fit one step past the
# last node diverges fast (Runge phenomenon). Measured on 24 real TCS daily closes with
# a true last close of 2452.70:
#   window  3 -> 2652     window  6 ->  2957
#   window  4 -> 2764     window  7 ->  3511
#   window  5 -> 2837     window 10 -> 20701   (unbounded: about -26,000,000)
# 4 keeps a genuine cubic divided-difference table while staying near the data.
NEWTON_MAX_POINTS = 4

# --- Logging: every request + every error (captured to logs/python.log) ---------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)5s [%(name)s] %(message)s",
)
logger = logging.getLogger("python-service")


@app.before_request
def _log_request_start():
    request._start_time = time.time()


@app.after_request
def _log_request_end(response):
    try:
        ms = int((time.time() - getattr(request, "_start_time", time.time())) * 1000)
        req_id = request.headers.get("X-Request-Id", "-")
        logger.info("%s %s -> %s (%dms) [%s]",
                    request.method, request.path, response.status_code, ms, req_id)
    except Exception:
        pass
    return response


@app.errorhandler(Exception)
def _log_exception(e):
    req_id = request.headers.get("X-Request-Id", "-")
    logger.error("Unhandled error on %s %s [%s]: %s\n%s",
                 request.method, request.path, req_id, e, traceback.format_exc())
    # Full detail goes to the log above; the client gets a generic message only.
    return jsonify({"error": "Internal server error"}), 500

def newton_divided_difference(x_points, y_points, x):
    n = len(x_points)
    coeff = list(y_points)
    for j in range(1, n):
        for i in range(n - 1, j - 1, -1):
            coeff[i] = (coeff[i] - coeff[i-1]) / (x_points[i] - x_points[i-j])
    result = coeff[0]
    product = 1.0
    for i in range(1, n):
        product *= (x - x_points[i-1])
        result += coeff[i] * product
    return round(result, 2)

def simpsons_rule(prices):
    n = len(prices)
    if n % 2 == 0:
        prices = prices[:-1]
        n -= 1
    h = 1
    total = prices[0] + prices[-1]
    for i in range(1, n - 1):
        total += (4 if i % 2 != 0 else 2) * prices[i]
    area = (h / 3) * total
    avg = area / (n - 1)
    mid = len(prices) // 2
    recent_avg = sum(prices[mid:]) / len(prices[mid:])
    early_avg  = sum(prices[:mid]) / len(prices[:mid])
    trend = "Bullish ↑" if recent_avg > early_avg else "Bearish ↓"
    return {"area": round(area, 2), "average": round(avg, 2), "trend": trend}

def runge_kutta_forecast(prices, days=5):
    if len(prices) < 2:
        return []
    changes = [prices[i+1] - prices[i] for i in range(len(prices)-1)]
    avg_rate = sum(changes) / len(changes)
    def f(t, y): return avg_rate
    h = 1.0
    y = prices[-1]
    forecast = []
    for i in range(days):
        t = i
        k1 = f(t, y)
        k2 = f(t + h/2, y + h*k1/2)
        k3 = f(t + h/2, y + h*k2/2)
        k4 = f(t + h, y + h*k3)
        y = y + (h/6) * (k1 + 2*k2 + 2*k3 + k4)
        forecast.append(round(y, 2))
    return forecast

def newton_raphson_breakeven(prices, buy_price, tolerance=0.01, max_iter=100):
    avg = sum(prices) / len(prices)
    x = avg
    for i in range(max_iter):
        fx = x - buy_price
        fpx = 1.0
        if abs(fpx) < 1e-10:
            break
        x_new = x - fx / fpx
        if abs(x_new - x) < tolerance:
            break
        x = x_new
    return round(x, 2)

def gauss_elimination_regression(prices):
    n = len(prices)
    x = list(range(n))
    sum_x  = sum(x)
    sum_y  = sum(prices)
    sum_x2 = sum(xi**2 for xi in x)
    sum_xy = sum(x[i]*prices[i] for i in range(n))
    A = [[sum_x2, sum_x, sum_xy], [sum_x, n, sum_y]]
    factor = A[1][0] / A[0][0]
    for j in range(3):
        A[1][j] -= factor * A[0][j]
    b = A[1][2] / A[1][1]
    a = (A[0][2] - A[0][1] * b) / A[0][0]
    next_x = n
    predicted = round(a * next_x + b, 2)
    direction = "↑ Uptrend" if a > 0 else "↓ Downtrend"
    return {"slope": round(a, 4), "intercept": round(b, 2),
            "predicted_next": predicted, "direction": direction}

@app.route('/predict', methods=['POST'])
def predict_all():
    data = request.get_json(silent=True) or {}
    raw_prices = data.get('prices', [])
    symbol = data.get('symbol', 'STOCK')

    if not isinstance(raw_prices, list):
        return jsonify({"error": "prices must be an array of numbers"}), 400
    try:
        prices = [float(p) for p in raw_prices]
    except (TypeError, ValueError):
        return jsonify({"error": "prices must be an array of numbers"}), 400
    if len(prices) < 3:
        return jsonify({"error": "Need at least 3 price points"}), 400

    try:
        buy_price = float(data.get('buyPrice', prices[0]))
    except (TypeError, ValueError):
        buy_price = prices[0]

    # Newton's divided difference builds a polynomial of degree len(points)-1 and we
    # evaluate it one step PAST the last node, so error grows explosively with the point
    # count (Runge phenomenon): 7 points is well behaved, 24 real daily closes around
    # ₹2400 extrapolate to about -26,000,000. Interpolate over only the most recent
    # window so the degree stays low; the other methods still see the full series.
    newton_window   = prices[-NEWTON_MAX_POINTS:]
    newton_x        = list(range(len(newton_window)))
    newton_pred     = newton_divided_difference(newton_x, newton_window, len(newton_window))

    x_points = list(range(len(prices)))
    next_x = len(prices)

    simpsons_result = simpsons_rule(prices)
    rk4_forecast    = runge_kutta_forecast(prices)
    nr_breakeven    = newton_raphson_breakeven(prices, buy_price)
    gauss_result    = gauss_elimination_regression(prices)

    bullish_votes = 0
    if newton_pred > prices[-1]: bullish_votes += 1
    if simpsons_result["trend"].startswith("Bullish"): bullish_votes += 1
    if rk4_forecast and rk4_forecast[-1] > prices[-1]: bullish_votes += 1
    if gauss_result["slope"] > 0: bullish_votes += 1

    if bullish_votes >= 3:
        overall_signal = "Bullish ↑"
    elif bullish_votes <= 1:
        overall_signal = "Bearish ↓"
    else:
        overall_signal = "Neutral →"

    return jsonify({
        "symbol": symbol,
        "currentPrice": prices[-1],
        "overallSignal": overall_signal,
        "bullishVotes": bullish_votes,
        "totalVotes": 4,
        "predictions": {
            "newton_interpolation": {
                "method": "Newton's Divided Difference",
                "predictedPrice": newton_pred,
                "signal": "Bullish ↑" if newton_pred > prices[-1] else "Bearish ↓",
                "description": "Polynomial interpolation of price curve"
            },
            "simpsons_trend": {
                "method": "Simpson's Rule",
                "trend": simpsons_result["trend"],
                "averagePrice": simpsons_result["average"],
                "description": "Numerical integration for trend strength"
            },
            "rk4_forecast": {
                "method": "Runge-Kutta (RK4)",
                "next5Days": rk4_forecast,
                "signal": "Bullish ↑" if rk4_forecast and rk4_forecast[-1] > prices[-1] else "Bearish ↓",
                "description": "ODE-based 5-day price forecast"
            },
            "newton_raphson": {
                "method": "Newton-Raphson",
                "breakevenPrice": nr_breakeven,
                "description": "Root-finding for breakeven price"
            },
            "gauss_regression": {
                "method": "Gauss Elimination (Linear Regression)",
                "predictedNext": gauss_result["predicted_next"],
                "direction": gauss_result["direction"],
                "slope": gauss_result["slope"],
                "description": "Linear regression via Gauss elimination"
            }
        }
    })

# --- Market data (yfinance) ----------------------------------------------------

@app.route('/market/status', methods=['GET'])
def market_status():
    """NSE/BSE open/closed status for the UI badge."""
    return jsonify(market_data.market_status())


@app.route('/market/universe', methods=['GET'])
def market_universe():
    """The default set of symbols this service seeds/polls."""
    return jsonify({"symbols": market_data.DEFAULT_UNIVERSE})


@app.route('/market/quote/<symbol>', methods=['GET'])
def market_quote(symbol):
    quote = market_data.get_quote(symbol)
    if quote is None:
        return jsonify({"error": f"No data for {symbol}"}), 404
    return jsonify(quote)


@app.route('/market/quotes', methods=['POST'])
def market_quotes():
    """Batch quotes. Body: {"symbols": ["RELIANCE", "TCS", ...]}.
    Falls back to the default universe when no symbols are supplied."""
    data = request.get_json(silent=True) or {}
    symbols = data.get('symbols') or market_data.DEFAULT_UNIVERSE
    return jsonify({"quotes": market_data.get_quotes(symbols)})


@app.route('/market/history/<symbol>', methods=['GET'])
def market_history(symbol):
    """OHLCV candles. Query: ?period=1mo&interval=1d"""
    period = request.args.get('period', '1mo')
    interval = request.args.get('interval', '1d')
    candles = market_data.get_history(symbol, period=period, interval=interval)
    return jsonify({"symbol": symbol.upper(), "candles": candles})


# --- Options pricing (Black-Scholes + Binomial + Monte Carlo) -------------------
# Engine lives in: python/options_pricing.py

@app.route('/options/price', methods=['POST'])
def options_price():
    """Price one option every way + Greeks.
    Body: {spot, strike, daysToExpiry, type, [volatility], [rate]}"""
    data = request.get_json(silent=True) or {}
    try:
        spot = float(data['spot'])
        strike = float(data['strike'])
        days = float(data.get('daysToExpiry', 30))
        opt_type = data.get('type', 'call').lower()
        rate = float(data.get('rate', RISK_FREE_RATE))
        sigma = float(data.get('volatility', 0.25))
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "spot, strike and type are required"}), 400

    T = days / 365.0
    return jsonify(options_pricing.price_all_methods(spot, strike, T, rate, sigma, opt_type))


@app.route('/options/chain/<symbol>', methods=['GET'])
def options_chain(symbol):
    """Build an options chain for a real stock: strikes around the live spot,
    each with Black-Scholes Call & Put prices + Delta. Query: ?expiryDays=30"""
    expiry_days = float(request.args.get('expiryDays', 30))

    quote = market_data.get_quote(symbol)
    if quote is None:
        return jsonify({"error": f"No data for {symbol}"}), 404
    spot = quote['currentPrice']

    # volatility from ~3 months of daily closes (engine: historical_volatility)
    hist = market_data.get_history(symbol, period="3mo", interval="1d")
    closes = [c['close'] for c in hist] if hist else []
    sigma = options_pricing.historical_volatility(closes)

    T = expiry_days / 365.0
    r = RISK_FREE_RATE

    # strikes from -10% to +10% of spot, in 2.5% steps
    chain = []
    for pct in [-10, -7.5, -5, -2.5, 0, 2.5, 5, 7.5, 10]:
        strike = round(spot * (1 + pct / 100), 2)
        chain.append({
            "strike": strike,
            "moneyness": "ATM" if pct == 0 else ("ITM-Call" if pct < 0 else "OTM-Call"),
            "call": {
                "price": options_pricing.black_scholes(spot, strike, T, r, sigma, "call"),
                "delta": options_pricing.greeks(spot, strike, T, r, sigma, "call")["delta"],
            },
            "put": {
                "price": options_pricing.black_scholes(spot, strike, T, r, sigma, "put"),
                "delta": options_pricing.greeks(spot, strike, T, r, sigma, "put")["delta"],
            },
        })

    return jsonify({
        "symbol": quote['symbol'],
        "spot": spot,
        "volatility": sigma,
        "riskFreeRate": r,
        "expiryDays": expiry_days,
        "chain": chain,
    })


@app.route('/options/quote/<symbol>', methods=['GET'])
def options_quote(symbol):
    """Authoritative premium for ONE option contract (used by the Trading service
    when buying/selling, so the price is computed server-side, not trusted from
    the client). Query: ?strike=&days=&type=call|put"""
    try:
        strike = float(request.args['strike'])
    except (KeyError, ValueError):
        return jsonify({"error": "strike is required"}), 400
    days = float(request.args.get('days', 30))
    opt_type = request.args.get('type', 'call').lower()

    quote = market_data.get_quote(symbol)
    if quote is None:
        return jsonify({"error": f"No data for {symbol}"}), 404
    spot = quote['currentPrice']

    hist = market_data.get_history(symbol, period="3mo", interval="1d")
    closes = [c['close'] for c in hist] if hist else []
    sigma = options_pricing.historical_volatility(closes)

    T = days / 365.0
    premium = options_pricing.black_scholes(spot, strike, T, RISK_FREE_RATE, sigma, opt_type)
    g = options_pricing.greeks(spot, strike, T, RISK_FREE_RATE, sigma, opt_type)

    return jsonify({
        "symbol": quote['symbol'],
        "companyName": quote.get('symbol'),
        "spot": spot,
        "strike": strike,
        "type": opt_type,
        "days": days,
        "volatility": sigma,
        "premium": premium,
        "greeks": g,
    })


@app.route('/options/quote-batch', methods=['POST'])
def options_quote_batch():
    """Price MANY contracts in one request.

    The Trading service shows a premium for every open position, and pricing them one
    at a time meant one HTTP round trip per position (and a repeated spot + history
    lookup for each). Here the spot price and volatility are resolved once per symbol
    and reused across that symbol's contracts, so N positions cost one request and
    one yfinance lookup per distinct symbol instead of N of each.

    Body: {"contracts": [{"symbol","strike","days","type"}, ...]}
    Returns results in the SAME ORDER as the request, with null premium for any
    contract whose symbol could not be priced, so the caller can match by index.
    """
    data = request.get_json(silent=True) or {}
    contracts = data.get('contracts')
    if not isinstance(contracts, list):
        return jsonify({"error": "contracts (array) is required"}), 400
    if len(contracts) > 200:
        return jsonify({"error": "too many contracts (max 200)"}), 400

    per_symbol = {}   # symbol -> (spot, sigma) or None when unpriceable

    def resolve(symbol):
        if symbol not in per_symbol:
            quote = market_data.get_quote(symbol)
            if quote is None:
                per_symbol[symbol] = None
            else:
                hist = market_data.get_history(symbol, period="3mo", interval="1d")
                closes = [c['close'] for c in hist] if hist else []
                per_symbol[symbol] = (quote['currentPrice'],
                                      options_pricing.historical_volatility(closes))
        return per_symbol[symbol]

    results = []
    for c in contracts:
        try:
            symbol = str(c['symbol'])
            strike = float(c['strike'])
            days = float(c.get('days', 30))
            opt_type = str(c.get('type', 'call')).lower()
        except (KeyError, TypeError, ValueError):
            results.append({"premium": None, "error": "invalid contract"})
            continue

        resolved = resolve(symbol)
        if resolved is None:
            results.append({"premium": None, "error": f"No data for {symbol}"})
            continue

        spot, sigma = resolved
        premium = options_pricing.black_scholes(
            spot, strike, days / 365.0, RISK_FREE_RATE, sigma, opt_type)
        results.append({
            "symbol": symbol, "strike": strike, "days": days, "type": opt_type,
            "spot": spot, "volatility": sigma, "premium": premium,
        })

    return jsonify({"results": results})


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "running", "service": "Stock Prediction + Market Data + Options API"})

if __name__ == '__main__':
    # debug MUST stay off by default: Werkzeug's debug mode exposes an interactive
    # code-execution console on any unhandled exception (remote code execution).
    # Bind to loopback so the service is not reachable from the network.
    debug = os.environ.get("FLASK_DEBUG", "false").lower() in ("1", "true", "yes")
    app.run(host="127.0.0.1", port=5001, debug=debug)
