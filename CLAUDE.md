# Working rules for AI coding agents

## 1. Design: never use

* Purple gradients.
* Pill-shaped buttons. Use rectangular or gently rounded ones.
* Emoji as icons. Use SVG icons or an icon font.
* Em dashes in user-facing text. Use a colon, a comma, or two sentences. Academic papers are exempt.
* Over-the-top scroll animations. Keep motion restrained and respect reduced-motion settings.
* Custom cursor animations or a hidden system cursor.
* AI-generated stock photos.
* AI filler copy, lorem ipsum, or vague marketing lines that say nothing.

## 2. Honesty

* No fake reviews, testimonials, user counts, metrics, customer logos or booking calendars.
* Every number shown to a user traces to real data. If the number does not exist yet, leave it out.
* Label clearly what is rule-based and what a model predicts.
* Report results faithfully: if tests fail, say so; if a step was skipped, say so.

## 3. Do not launch until

1. A custom domain is connected, served over HTTPS.
2. A favicon is added.
3. Any "Made with AI" or site-builder badge is removed.
4. A privacy policy page exists.
5. A terms and conditions page exists.

Check each item explicitly before calling anything launch ready.

## 4. Writing

* Plain language for the people who will use it, not the people who built it.
* Technical detail goes behind a "show the working" toggle.
* Full sentences. Say each thing once.

## 5. Security and data

* Never commit a database with real accounts, `.env` files, keys or secrets.
* Never write a real password into a file, a command or a commit.
* Access rules are enforced on the server, not only in the page.
* Accounts created while testing are real accounts: delete them when the check is done.
* Hash passwords with a slow hash (scrypt, argon2 or bcrypt), keep sessions in HttpOnly cookies, rate-limit sign-in and sign-up, and send security headers.

## 6. Code and testing

* Match the surrounding code: naming, comment density and idiom.
* Name tests in plain sentences that say why the case matters. A regression test says what broke.
* Run the full test suite before every commit.
* After a UI change, open the page in a browser and read the console. Prove it works; do not ask the user to check.
* A field the page hides must be disabled too, or a hidden required field blocks its form without saying why.
* Colours come from design tokens, defined for both the light and the dark theme.

## 7. Git

* Commit or push only when asked, and never push files the user said to keep out.
* Before starting, run `git status` and `git log --oneline -3`, and say what will change.
* When two agents work at once, give each its own branch or worktree, and its own port.

## 8. Quality bar

* Make no mistakes: check facts in the code or data before writing them down.
* Fix bugs found along the way, or flag them. Never leave one silently.

## This project

**What it is:** StockTrading Pro, a stock and options paper-trading simulator built as
microservices. Real NSE market data via yfinance, live prices over WebSocket, and an
options desk priced with Black-Scholes, a binomial tree and Monte Carlo. Virtual money
only, no real funds. Six processes: React frontend (3002), Spring Cloud Gateway (8090),
Auth/User (8082), Market-Data (8081), Trading (8084), Python/Flask quant service (5001).
Database-per-service: `auth_db`, `market_db`, `trading_db`.

**Commands:**

| Task | Command |
|---|---|
| Install (one time, per clone) | `./setup.sh` |
| Run everything | `./start-all.sh` |
| Stop everything | `./stop-all.sh` |
| Frontend tests | `cd frontend && CI=true npm test` |
| Build one Java service | `cd <service> && ./mvnw compile` |
| Logs | `tail -f logs/<service>.log` |

**Testing, stated honestly:** there is no real test suite, and the one test file does
not even run. `frontend/src/App.test.js` is untouched Create React App boilerplate, and
it currently FAILS to start: `react-router-dom` 7 is ESM-only and CRA 5's Jest cannot
resolve it, so the suite dies at import. No Java or Python service has any tests.

So "run the full test suite before every commit" currently means: compile every service
(`./mvnw compile`), and exercise the affected flow by hand against a running stack.
Never report tests as passing. Fixing the Jest setup (a `transformIgnorePatterns`
override so Babel transforms the router's ESM) is open work.

**Things that are easy to get wrong:**

* `.env` is gitignored, so a fresh clone has none and nothing starts. Run `./setup.sh`
  first. The services deliberately have no hardcoded credential fallbacks.
* `lsof -ti :PORT` also matches processes holding a *client* connection to that port.
  Market-Data keeps a connection to Python on 5001, so killing port 5001 without
  `-sTCP:LISTEN` also kills Market-Data. Always pass `-sTCP:LISTEN`.
* The JWT lives in an **httpOnly cookie**, not localStorage. It is not readable from JS
  or from DevTools. The gateway converts the cookie into an `Authorization: Bearer`
  header for downstream services. Changing `JWT_SECRET` invalidates every session.
* Cookie auth is ambient, so CSRF matters. `CsrfOriginFilter` in the gateway checks the
  Origin on state-changing requests. Do not disable it.
* Java services need a restart to pick up changes. Python and the frontend hot-reload.
* The poms target Java 17; the project is developed on 21.
* yfinance returns nothing when NSE is closed, so empty weekend charts are not a bug.
  Yahoo also blocks many cloud IPs, which is why this runs locally.
* Services talk to each other over HTTP inside a database transaction. Wallet moves
  carry an `operationId` so a retry cannot double-apply. Keep that property.
* Money is `BigDecimal` end to end. Do not introduce `double` into a price or balance.
