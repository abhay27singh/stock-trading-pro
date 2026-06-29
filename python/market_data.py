"""
Market-data provider backed by yfinance (real NSE/BSE data).

Indian tickers on Yahoo Finance use a suffix:
  - NSE  ->  RELIANCE.NS
  - BSE  ->  RELIANCE.BO

The rest of the system speaks in plain symbols (e.g. "RELIANCE"); this module
maps them to Yahoo tickers and back, and caches responses with a short TTL so we
do not hammer Yahoo and trip its rate limiter.
"""

import time
import threading
from datetime import datetime
import pytz
import yfinance as yf

IST = pytz.timezone("Asia/Kolkata")

# Default exchange suffix when the caller passes a bare symbol.
DEFAULT_SUFFIX = ".NS"  # NSE

# A curated starter universe of liquid NSE names. The frontend/back end can
# request any symbol; this is just what we seed and poll by default.
DEFAULT_UNIVERSE = [
    "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK",
    "SBIN", "BHARTIARTL", "ITC", "LT", "WIPRO",
]

# --- tiny thread-safe TTL cache -------------------------------------------------
_cache = {}
_cache_lock = threading.Lock()


def _cache_get(key, ttl):
    with _cache_lock:
        entry = _cache.get(key)
        if entry and (time.time() - entry[0]) < ttl:
            return entry[1]
    return None


def _cache_put(key, value):
    with _cache_lock:
        _cache[key] = (time.time(), value)


def to_yahoo(symbol: str) -> str:
    """Normalise a bare symbol to a Yahoo ticker. Pass-through if already suffixed."""
    s = symbol.strip().upper()
    if "." in s:
        return s
    return f"{s}{DEFAULT_SUFFIX}"


def from_yahoo(ticker: str) -> str:
    """Strip the exchange suffix for display."""
    return ticker.split(".")[0].upper()


def get_quote(symbol: str, ttl: int = 5):
    """Latest price + day stats for one symbol. Cached for `ttl` seconds."""
    ticker = to_yahoo(symbol)
    cached = _cache_get(f"quote:{ticker}", ttl)
    if cached is not None:
        return cached

    t = yf.Ticker(ticker)
    fi = getattr(t, "fast_info", {}) or {}

    # Daily history is the reliable source for previous close + day high/low.
    # (fast_info.previous_close is often empty for NSE tickers, which made the
    # change always 0%.) Last row = today (partial during market hours),
    # second-to-last row = the previous trading day's close.
    hist = t.history(period="5d", interval="1d")
    if hist is None or hist.empty:
        return None
    closes = hist["Close"].tolist()
    highs = hist["High"].tolist()
    lows = hist["Low"].tolist()

    last = fi.get("last_price")
    last = float(last) if last is not None else float(closes[-1])

    # previous close = the close before today's row
    prev = float(closes[-2]) if len(closes) >= 2 else float(closes[-1])

    change = last - prev
    change_pct = (change / prev * 100) if prev else 0.0

    quote = {
        "symbol": from_yahoo(ticker),
        "yahooTicker": ticker,
        "currentPrice": round(last, 2),
        "previousPrice": round(prev, 2),
        "change": round(change, 2),
        "changePercent": round(change_pct, 2),
        "dayHigh": round(float(highs[-1]), 2),
        "dayLow": round(float(lows[-1]), 2),
        "currency": fi.get("currency", "INR"),
        "timestamp": int(time.time()),
    }
    _cache_put(f"quote:{ticker}", quote)
    return quote


def get_quotes(symbols, ttl: int = 5):
    """Batch quotes. Skips symbols Yahoo can't resolve."""
    out = []
    for sym in symbols:
        try:
            q = get_quote(sym, ttl=ttl)
            if q:
                out.append(q)
        except Exception as e:  # one bad ticker shouldn't fail the batch
            print(f"[market_data] quote failed for {sym}: {e}")
    return out


def get_history(symbol: str, period: str = "1d", interval: str = "5m", ttl: int = 60):
    """OHLCV candles for charting. Returns a list of candle dicts (epoch seconds).
    Defaults to 1-day period with 5-minute candles for intraday view."""
    ticker = to_yahoo(symbol)
    key = f"hist:{ticker}:{period}:{interval}"
    cached = _cache_get(key, ttl)
    if cached is not None:
        return cached

    t = yf.Ticker(ticker)
    hist = t.history(period=period, interval=interval)
    if hist is None or hist.empty:
        return []

    candles = []
    for idx, row in hist.iterrows():
        # yfinance intraday timestamps are tz-aware in the exchange's timezone
        # (Asia/Kolkata for .NS). lightweight-charts renders epochs in UTC, so we
        # add the exchange's UTC offset to make candles display IST wall-clock time.
        offset = int(idx.utcoffset().total_seconds()) if idx.utcoffset() else 0
        candles.append({
            "time": int(idx.timestamp()) + offset,
            "open": round(float(row["Open"]), 2),
            "high": round(float(row["High"]), 2),
            "low": round(float(row["Low"]), 2),
            "close": round(float(row["Close"]), 2),
            "volume": int(row["Volume"]) if not _is_nan(row["Volume"]) else 0,
        })
    _cache_put(key, candles)
    return candles


def _is_nan(x):
    return x != x


def market_status():
    """NSE/BSE trading hours: Mon-Fri, 09:15-15:30 IST.
    Returns status used by the UI to show an OPEN/CLOSED badge."""
    now = datetime.now(IST)
    is_weekday = now.weekday() < 5  # Mon=0 .. Fri=4
    open_t = now.replace(hour=9, minute=15, second=0, microsecond=0)
    close_t = now.replace(hour=15, minute=30, second=0, microsecond=0)
    is_open = is_weekday and open_t <= now <= close_t
    return {
        "isOpen": is_open,
        "status": "OPEN" if is_open else "CLOSED",
        "serverTime": now.strftime("%Y-%m-%d %H:%M:%S"),
        "timezone": "Asia/Kolkata",
        "session": "09:15 - 15:30 IST (Mon-Fri)",
    }
