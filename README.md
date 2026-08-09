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

- **Java 17+** — 21 recommended (the services are built and tested on 21)
- **Node.js 18+** and npm
- **Python 3.9+**
- **MySQL 8** running locally
- **Maven** — not required, each service bundles the `./mvnw` wrapper

`setup.sh` checks all of these and prints the right install command for your platform.

**Platform:** the helper scripts are bash and use `lsof`, so they run on **macOS and
Linux**. On **Windows use WSL** — or run each service manually (see
[Running services individually](#️-running-services-individually-optional)), which
needs no scripts.

**Network:** live prices come from Yahoo Finance via `yfinance`, so the machine needs
internet access. Yahoo rate-limits or blocks some datacentre/cloud IPs, which is why
this project is designed to run locally rather than on a free cloud host.

---

## 🚀 Quick Start

```bash
git clone https://github.com/abhay27singh/stock-trading-pro.git
cd stock-trading-pro

./setup.sh        # one-time: creates .env, Python venv, npm install
./start-all.sh    # starts all 6 services
```

Then open **http://localhost:3002**.

To stop everything:
```bash
./stop-all.sh
```

`setup.sh` is safe to re-run — it never overwrites an existing `.env` and skips
work already done. It asks once for your MySQL password and generates the JWT and
internal service keys randomly, so no secret is shared between installs.

> The databases (`auth_db`, `market_db`, `trading_db`) are created automatically on first run.
> Register a new account in the app to start trading. To make a user an admin:
> `mysql -u<user> -p auth_db -e "UPDATE users SET role='ADMIN' WHERE email='you@example.com';"`
> then **log out and back in** (the role is embedded in the JWT).

### Configuration

All secrets live in `.env`, which is gitignored and never committed — see
`.env.example` for the full list. The services deliberately have **no hardcoded
fallbacks**, so a missing or incomplete `.env` stops startup with an explicit
message rather than failing halfway.

| Variable | Purpose |
|---|---|
| `DB_USERNAME`, `DB_PASSWORD` | MySQL credentials (each service uses its own schema) |
| `JWT_SECRET` | Shared HS256 signing key — must be ≥ 32 bytes and identical across services |
| `INTERNAL_API_KEY` | Guards service-to-service wallet calls |
| `CORS_ALLOWED_ORIGINS` | Origins allowed to call the gateway and open the WebSocket |
| `MARKET_POLL_RATE` | How often (ms) live quotes are pulled |

---

## 🩺 Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `✗ Missing .env` | Run `./setup.sh`. `.env` is gitignored, so a fresh clone never has one. |
| `✗ Java 21 not found` | `brew install openjdk@21`, or set `JAVA_HOME` to a JDK 21. |
| Services start, but login fails | MySQL is not running, or `DB_PASSWORD` is wrong. Check `logs/auth.log`. |
| Logged in but every page is empty | Token expired or `JWT_SECRET` changed. Log out and back in. |
| Prices frozen / chart empty | Python service down — check `logs/python.log`. yfinance also returns nothing when NSE is closed (weekends). |
| A port is already in use | `./stop-all.sh` frees all six, then start again. |

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
