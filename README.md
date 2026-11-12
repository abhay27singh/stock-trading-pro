# StockTrading Pro

A full-stack stock and options trading simulator built as a loosely coupled microservices
system, with real Indian market data from the NSE, live prices over WebSocket, and an
options desk priced with Black-Scholes, a binomial tree and Monte Carlo.

![Java](https://img.shields.io/badge/Java-17%2B-007396?style=flat-square&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-6DB33F?style=flat-square&logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?style=flat-square&logo=python&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql&logoColor=white)

> Paper-trading and educational project that uses virtual money. No real funds are
> involved, and it is not a brokerage.

---

## Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Security](#security)
- [Design system](#design-system)
- [Tech stack](#tech-stack)
- [Ports and databases](#ports-and-databases)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Running services individually](#running-services-individually)
- [Project structure](#project-structure)
- [The quant engine](#the-quant-engine)
- [Logging and debugging](#logging-and-debugging)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Author](#author)
- [Licence](#licence)

---

## Overview

The project splits a monolithic trading app into four independently deployable Spring
services behind a Spring Cloud Gateway, plus a Python quant service and a React client.
Each service owns its own MySQL schema and talks to the others over HTTP, which is the
practical definition of loose coupling rather than the diagram-only kind.

Prices are real. The Python service pulls live NSE quotes and historical candles through
`yfinance`, the Market-Data service stores and broadcasts them over WebSocket, and the
Trading service never touches a price table directly: it asks Market-Data, every time.

## Features

- **Real NSE market data** via `yfinance` (live spot prices + intraday/historical candles)
- **Live price updates** over **WebSocket** (no page refresh)
- **Stock trading**: buy/sell with a virtual ₹1,00,000 wallet, portfolio & P&L
- **Options desk**: Call/Put pricing via **3 methods that cross-validate each other**:
  - Black-Scholes (closed-form) · Binomial Tree (CRR) · Monte Carlo
  - The **Greeks** (Δ Γ Θ ν ρ), historical volatility, and **payoff diagrams**
- **Admin dashboard**: manage users (bulk delete), add NSE stocks, view platform stats
- **Microservices architecture**: API Gateway + 4 services, **database-per-service**, OAuth2 JWT, inter-service calls
- **Centralized logging** with request **correlation IDs** to trace a request across all services
- **Obsidian Terminal UI**: a dense dark design system where colour carries meaning, with monospaced tabular figures so columns do not shift as prices tick

---

## Architecture

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

Each service **owns its own database**, the textbook definition of loose coupling.

---

## Security

Security is enforced on the server, never only in the page.

| Area | How it works |
|---|---|
| Passwords | BCrypt hashes. The plaintext is never written to the database or a log. |
| Sessions | The JWT is issued into an **HttpOnly cookie**, so browser JavaScript cannot read it and an XSS payload cannot steal it. The gateway converts the cookie into an `Authorization` header for downstream services. |
| CSRF | Cookie auth is ambient, so `CsrfOriginFilter` at the gateway checks the `Origin` on every state-changing request against an allowlist. |
| Brute force | Sign-in and sign-up are rate limited per client, returning `429` once the window is exceeded. |
| Response headers | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy` and `Permissions-Policy` are set centrally at the gateway. |
| Authorisation | Admin routes require the `ADMIN` role, checked in each service's `SecurityConfig`. |
| Service to service | Internal wallet endpoints are guarded by a shared `X-Internal-Key` and are not routed from outside. |
| Money integrity | Wallet moves carry an `operationId` recorded in `wallet_operations`, so a retry after a timeout cannot apply the same debit twice. |
| Secrets | Everything lives in `.env`, which is gitignored. The services have **no hardcoded credential fallbacks**, so a missing value stops startup with a clear message instead of failing halfway. |

---

## Design system

The interface follows an "Obsidian Terminal" language intended for reading dense
numbers for long stretches, defined once in `frontend/src/theme.js`:

- **Colour carries meaning, never decoration.** Emerald and crimson are reserved for
  price direction, blue for commands the user issues, amber for warnings. A green number
  therefore always means "up".
- **Depth comes from surface tiers and 1px borders**, not shadows or blur, which smear
  across a dense table and cost GPU time on every repaint.
- **Figures are monospaced** with `tabular-nums`, so a live price cannot shift the width
  of its own column as it ticks.
- **Corners stay sharp**, 2px on containers and 4px on controls. Pill shapes are not used.
- **Motion is restrained** and fully disabled under `prefers-reduced-motion`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Material UI, Framer Motion, lightweight-charts |
| API Gateway | Spring Cloud Gateway |
| Backend services | Spring Boot 3.5, Java 21, Spring Security (OAuth2 Resource Server / JWT) |
| Quant / data service | Python 3, Flask, yfinance, NumPy |
| Databases | MySQL 8 (one schema per service) |
| Auth | JWT (HS256), shared-secret service-to-service key |

## Ports and databases

| Service | Port | Database |
|---|---|---|
| Frontend (React) | `3002` | n/a |
| API Gateway | `8090` | n/a |
| Auth / User | `8082` | `auth_db` |
| Market-Data | `8081` | `market_db` |
| Trading | `8084` | `trading_db` |
| Python (data + options) | `5001` | n/a |

---

## Prerequisites

- **Java 17+**, 21 recommended (the services are built and tested on 21)
- **Node.js 18+** and npm
- **Python 3.9+**
- **MySQL 8** running locally
- **Maven**: not required, each service bundles the `./mvnw` wrapper

`setup.sh` checks all of these and prints the right install command for your platform.

**Platform:** the helper scripts are bash and use `lsof`, so they run on **macOS and
Linux**. On **Windows use WSL**, or run each service manually (see
[Running services individually](#running-services-individually)), which
needs no scripts.

**Network:** live prices come from Yahoo Finance via `yfinance`, so the machine needs
internet access. Yahoo rate-limits or blocks some datacentre/cloud IPs, which is why
this project is designed to run locally rather than on a free cloud host.

---

## Quick start

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

`setup.sh` is safe to re-run. It never overwrites an existing `.env` and skips
work already done. It asks once for your MySQL password and generates the JWT and
internal service keys randomly, so no secret is shared between installs.

> The databases (`auth_db`, `market_db`, `trading_db`) are created automatically on first run.
> Register a new account in the app to start trading. To make a user an admin:
> `mysql -u<user> -p auth_db -e "UPDATE users SET role='ADMIN' WHERE email='you@example.com';"`
> then **log out and back in** (the role is embedded in the JWT).

### Configuration

All secrets live in `.env`, which is gitignored and never committed. See
`.env.example` for the full list. The services deliberately have **no hardcoded
fallbacks**, so a missing or incomplete `.env` stops startup with an explicit
message rather than failing halfway.

| Variable | Purpose |
|---|---|
| `DB_USERNAME`, `DB_PASSWORD` | MySQL credentials (each service uses its own schema) |
| `JWT_SECRET` | Shared HS256 signing key, must be ≥ 32 bytes and identical across services |
| `INTERNAL_API_KEY` | Guards service-to-service wallet calls |
| `CORS_ALLOWED_ORIGINS` | Origins allowed to call the gateway and open the WebSocket |
| `MARKET_POLL_RATE` | How often (ms) live quotes are pulled |

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `✗ Missing .env` | Run `./setup.sh`. `.env` is gitignored, so a fresh clone never has one. |
| `✗ Java 17+ not found` | Install a JDK (21 recommended), or set `JAVA_HOME`. `setup.sh` prints the command for your platform. |
| Services start, but login fails | MySQL is not running, or `DB_PASSWORD` is wrong. Check `logs/auth.log`. |
| Logged in but every page is empty | Token expired or `JWT_SECRET` changed. Log out and back in. |
| Prices frozen / chart empty | Python service down. Check `logs/python.log`. yfinance also returns nothing when NSE is closed (weekends). |
| A port is already in use | `./stop-all.sh` frees all six, then start again. |

---

## Running services individually

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

## Project structure

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

## The quant engine

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

## Logging and debugging

Every service logs to the `logs/` folder. Each request gets a **correlation ID** (`X-Request-Id`) propagated by the gateway, so you can trace one request across all services:

```bash
tail -f logs/*.log              # watch everything live
grep "<request-id>" logs/*.log  # trace one request end-to-end
```

---

## Roadmap

- A real test suite, then CI, which is the largest gap in the project today
- Responsive layout and a mobile navigation drawer
- Containerised deployment, noting that `yfinance` is blocked on many cloud IPs, which
  is why this currently runs locally
- Greeks pushed over the WebSocket alongside prices
- Settlement history for expired option positions

---

---

## Testing

Stated plainly: there is no meaningful automated test suite yet. The frontend carries
only the Create React App default, and no Java or Python service has tests. Until that
changes, verification means compiling every service and exercising the affected flow by
hand against a running stack. Building this out is the first item on the roadmap.

---

## Author

**Abhay Pratap Singh** ([@abhay27singh](https://github.com/abhay27singh))

Designed and built as a final-year project: the microservices split, the options pricing
engine, the market data pipeline and the interface are all my own work.

---

## Licence

No licence has been chosen yet, so default copyright applies and all rights are reserved.
Add a `LICENSE` file if you want to permit reuse.

---

## Disclaimer

This is an educational paper-trading project. It uses virtual money and simulated trades.
It is **not** a real brokerage, it is not registered with SEBI or any other financial
regulator, and nothing it displays is investment advice. Market data comes from a free
public source and may be delayed or incomplete. Option premiums are produced by a
Black-Scholes model from historical volatility, so they will not match the price of any
real contract.
