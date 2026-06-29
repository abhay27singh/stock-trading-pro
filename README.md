# 📈 StockTrading Pro

A full-stack **stock & options trading simulator** built as a **loosely-coupled microservices** system, with **real Indian market data (NSE)**, live WebSocket prices, and an **options desk priced with Black-Scholes, Binomial Tree and Monte Carlo**.

> Paper-trading / educational project — uses **virtual money**. No real funds are involved.

---

## ✨ Features

- **Real NSE market data** via `yfinance` (live spot prices + intraday/historical candles)
- **Live price updates** over **WebSocket** (no page refresh)
- **Stock trading** — buy/sell with a virtual ₹1,00,000 wallet, portfolio & P&L
- **Options desk** — Call/Put pricing via **3 methods that cross-validate each other**:
  - Black-Scholes (closed-form) · Binomial Tree (CRR) · Monte Carlo
  - The **Greeks** (Δ Γ Θ ν ρ), historical volatility, and **payoff diagrams**
- **Admin dashboard** — manage users (bulk delete), add NSE stocks, view platform stats
- **Microservices architecture** — API Gateway + 4 services, **database-per-service**, OAuth2 JWT, inter-service calls
- **Centralized logging** with request **correlation IDs** to trace a request across all services
- **Professional dark "trading terminal" UI** (React + MUI + Framer Motion)

---

## 🏗️ Architecture

```
                         React Frontend (3002)
                                  │  REST
                                  ▼
                        API Gateway (8090)  ── Spring Cloud Gateway
        ┌──────────────┬──────────────────────┬───────────────────────┐
        ▼              ▼                      ▼                       ▼
  Auth/User (8082)  Market-Data (8081)   Trading (8084)        (routes by path)
   → auth_db         → market_db           → trading_db
   identity+wallet   stocks/prices/        portfolio/orders/
                     options pricing       watchlist/options
        │                  │                    │
        │                  ▼                    │ (inter-service calls:
        │           Python service (5001)       │  Trading → Market-Data for price,
        │           yfinance + Black-Scholes     │  Trading → Auth for wallet)
        └──────────── WebSocket (live prices) ───┘
```

Each service **owns its own database** — the textbook definition of loose coupling.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Material UI, Framer Motion, lightweight-charts |
| API Gateway | Spring Cloud Gateway |
| Backend services | Spring Boot 3.5, Java 21, Spring Security (OAuth2 Resource Server / JWT) |
| Quant / data service | Python 3, Flask, yfinance, NumPy |
| Databases | MySQL 8 (one schema per service) |
| Auth | JWT (HS256), shared-secret service-to-service key |

## 🔌 Ports

| Service | Port | Database |
|---|---|---|
| Frontend (React) | `3002` | — |
| API Gateway | `8090` | — |
| Auth / User | `8082` | `auth_db` |
| Market-Data | `8081` | `market_db` |
| Trading | `8084` | `trading_db` |
| Python (data + options) | `5001` | — |

---

## ✅ Prerequisites

- **Java 21** (e.g. `brew install openjdk@21`)
- **Node.js 18+** and npm
- **Python 3.9+**
- **MySQL 8** running locally (default user `root` / password `***REDACTED***`, or set your own — see below)
- **Maven** (or use the bundled `./mvnw` wrapper in each service)

---

## 🚀 Quick Start (one command)

```bash
# 1. clone
git clone https://github.com/abhay27singh/stock-trading-pro.git
cd stock-trading-pro

# 2. one-time: create the Python virtualenv
cd python && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt && cd ..

# 3. start EVERYTHING (Python, Auth, Market-Data, Trading, Gateway, Frontend)
./start-all.sh
```

Then open **http://localhost:3002**.

To stop everything:
```bash
./stop-all.sh
```

> The databases (`auth_db`, `market_db`, `trading_db`) are created automatically on first run.
> Register a new account in the app to start trading. To make a user an admin:
> `mysql -uroot -p***REDACTED*** auth_db -e "UPDATE users SET role='ADMIN' WHERE email='you@example.com';"` (then log out & back in).

### Custom DB credentials
The services read these env vars (defaults shown): `DB_USERNAME=root`, `DB_PASSWORD=***REDACTED***`, `JWT_SECRET`, `INTERNAL_API_KEY`. Set them before `./start-all.sh` if your MySQL differs.

---

## ▶️ Running services individually (optional)

```bash
# Python
cd python && ./venv/bin/python prediction_service.py

# Each Spring service (Java 21)
cd services/auth-user-service && ./mvnw spring-boot:run
cd backend                    && ./mvnw spring-boot:run   # Market-Data
cd services/trading-service   && ./mvnw spring-boot:run
cd services/gateway           && ./mvnw spring-boot:run

# Frontend
cd frontend && npm install && npm start
```

---

## 📁 Project Structure

```
stock-trading-pro/
├── frontend/                 # React app (UI)
├── backend/                  # Market-Data service (stocks, prices, options pricing proxy)
├── services/
│   ├── gateway/              # API Gateway (single entry point, routing, CORS, request logging)
│   ├── auth-user-service/    # Auth, users, wallet
│   └── trading-service/      # Portfolio, orders, watchlist, options positions
├── python/                   # Flask: yfinance data + options/prediction engines
│   ├── market_data.py            # live quotes + history (yfinance)
│   ├── options_pricing.py        # Black-Scholes / Binomial / Monte Carlo / Greeks
│   └── prediction_service.py     # Flask endpoints
├── start-all.sh / stop-all.sh    # run/stop the whole stack
└── logs/                     # per-service logs (created at runtime)
```

---

## 🧮 The Quant Engine (options pricing)

All pricing methods live in **`python/options_pricing.py`**, each clearly commented:

| Method | Function | Role |
|---|---|---|
| Black-Scholes | `black_scholes()` | Primary closed-form pricer |
| Binomial Tree (CRR) | `binomial_tree()` | Numerical cross-check |
| Monte Carlo | `monte_carlo()` | Statistical cross-check |
| The Greeks | `greeks()` | Δ Γ Θ ν ρ sensitivities |
| Historical volatility | `historical_volatility()` | σ from log-returns |

All three methods converge to the same price (validated against textbook values + put-call parity).

---

## 🔍 Logging & Debugging

Every service logs to the `logs/` folder. Each request gets a **correlation ID** (`X-Request-Id`) propagated by the gateway, so you can trace one request across all services:

```bash
tail -f logs/*.log              # watch everything live
grep "<request-id>" logs/*.log  # trace one request end-to-end
```

---

## 🗺️ Roadmap / Future Work

- Public deployment (Docker + cloud) — *currently runs locally*
- Automated tests + CI/CD
- Real payment gateway integration (currently a demo/sandbox UI)
- WebSocket-pushed options Greeks

---

## 📝 Note

This is an **educational paper-trading project**. It uses **virtual money** and simulated trades — it is **not** a real brokerage and does not handle real funds.
