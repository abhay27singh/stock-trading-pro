import axios from 'axios';

// All REST goes through the API Gateway (8090), which routes to the
// Auth service (8082) and Core service (8081). WebSocket stays direct to Core.
const API_URL = 'http://localhost:8090/api';

const api = axios.create({
  baseURL: API_URL,
  // Send the httpOnly auth cookie with every request. The JWT is no longer kept
  // in localStorage (XSS-readable) — the browser holds it in an httpOnly cookie
  // and attaches it automatically, so no Authorization header is set here.
  withCredentials: true,
  // Never hang forever on an unresponsive service. Without this a down auth
  // service makes the Logout request never settle, so logout silently does nothing.
  timeout: 15000,
});

// Login/register legitimately 401 on bad credentials — that must not trigger a redirect.
const isAuthEndpoint = (url = '') => url.includes('/auth/');

const clearSession = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token'); // legacy pre-cookie JWT, if an old build left one
  if (!window.location.pathname.startsWith('/login')) {
    window.location.replace('/login');
  }
};

// Log every failed API call to the console for easy debugging (status + url + message)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const method = err.config?.method?.toUpperCase() || '?';
    const url = err.config?.url || '?';
    const status = err.response?.status || 'NETWORK';
    console.error(`[API ✗] ${method} ${url} → ${status}`, err.response?.data ?? err.message);

    // The auth cookie is httpOnly, so the app cannot tell from JS whether the
    // session is still alive — a 401 is the only signal. Without this branch an
    // expired cookie leaves `user` in localStorage, so the router keeps rendering
    // the app (and bouncing /login → /dashboard) while every call 401s, with no
    // way back to the login form. Clearing the stale profile breaks that trap.
    if (err.response?.status === 401 && !isAuthEndpoint(err.config?.url)) {
      clearSession();
    }
    return Promise.reject(err);
  }
);

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
};

export const stockService = {
  getAllStocks: () => api.get('/stocks'),
  getStock: (symbol) => api.get(`/stocks/${symbol}`),
  // Real intraday OHLCV from yfinance — 5-min candles for today
  getOhlcv: (symbol, period = '1d', interval = '5m') =>
    api.get(`/stocks/${symbol}/ohlcv?period=${period}&interval=${interval}`),
  getMarketStatus: () => api.get('/stocks/market-status'),
};

export const tradeService = {
  executeTrade: (data) => api.post('/trade/execute', data),
  getPortfolio: () => api.get('/trade/portfolio'),
  getHistory: () => api.get('/trade/history'),
};

export const optionsService = {
  // pricing + chain (Market-Data → Python engine)
  getChain: (symbol, expiryDays = 30) => api.get(`/options/chain/${symbol}?expiryDays=${expiryDays}`),
  priceOption: (data) => api.post('/options/price', data), // 3-method comparison + Greeks
  // trading (Trading service)
  buyOption: (data) => api.post('/options/buy', data),
  getPositions: () => api.get('/options/positions'),
  closePosition: (id) => api.post(`/options/close/${id}`),
};

export const watchlistService = {
  getWatchlist: () => api.get('/watchlist'),
  addToWatchlist: (symbol) => api.post(`/watchlist/add/${symbol}`),
  removeFromWatchlist: (symbol) => api.delete(`/watchlist/remove/${symbol}`),
};

export const userService = {
  getProfile: () => api.get('/user/profile'),
  deposit: (amount) => api.post('/user/deposit', { amount }),
};

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getTrades: () => api.get('/admin/trades'),
  getStocks: () => api.get('/admin/stocks'),
  addStock: (data) => api.post('/admin/stocks', data),
  updateStock: (id, data) => api.put(`/admin/stocks/${id}`, data),
  deleteStock: (id) => api.delete(`/admin/stocks/${id}`),
};

export default api;
