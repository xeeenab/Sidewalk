# 🛣️ Sidewalk

[![CI](https://github.com/MixMatch-Inc/Sidewalk/actions/workflows/ci.yml/badge.svg)](https://github.com/MixMatch-Inc/Sidewalk/actions/workflows/ci.yml)

**Sidewalk** is an open-source, civic reporting and accountability platform that empowers citizens to document local issues, track government response, and ensure follow-through—publicly and transparently.

Citizens can report problems like damaged roads, broken streetlights, flooding, waste issues, or public safety concerns, attach media and location data, and monitor progress from *reported* to *resolved*.

What sets Sidewalk apart is its **Stellar-powered accountability layer**. By anchoring civic actions on-chain, Sidewalk turns public complaints into verifiable records that cannot be ignored, altered, or quietly deleted.

> **If it’s on-chain, it can’t be swept under the rug.**

[SIDEWALK FIGMA](https://www.figma.com/design/cH6GFhWhtgxzESR8pedNGl/Sidewalk?node-id=0-1&t=n3OH48FSO4NjbBf3-1)

---

## 🌍 Why Sidewalk?

Civic reporting tools already exist—but trust, incentives, and accountability are often missing.

Most platforms are:
* Centralized and opaque
* Easy to manipulate or abandon
* Focused on reporting, not resolution

Sidewalk is built around a different idea:
**Civic participation should be verifiable, incentivized, and impossible to ignore.**

By combining community reporting with blockchain-backed transparency, Sidewalk transforms everyday civic complaints into durable public records and measurable performance data.

---

## ✨ Core Capabilities

* **Civic Issue Reporting** – Report infrastructure and public service problems
* **Media & Location Proof** – Photos, videos, timestamps, and geotags
* **Status Tracking** – Follow issues from report → acknowledgement → resolution
* **Public Metrics** – Resolution time and responsiveness are visible to all
* **Mobile-First Design** – Built for fast, on-the-ground reporting

---

## ⭐ The Stellar Advantage

Sidewalk uses **Stellar** as a trust and coordination layer—not as hype, but as infrastructure.

### 1. Proof & Transparency
Every critical civic action is anchored on-chain:
* Issue creation
* Official acknowledgement
* Resolution confirmation
* Time-to-fix metrics

Each report is associated with a **Stellar transaction hash**, providing immutable, timestamped proof. This ensures that complaints cannot be edited, hidden, or erased after submission.

### 2. Tokenized Civic Accountability
Sidewalk introduces a **community civic token** on Stellar. Citizens earn tokens for submitting valid reports and verifying others. Tokens can be used to vote on priority issues or access local civic perks.

### 3. Smart Escalation & Deadlines
Sidewalk enforces accountability through time-bound logic. Missed deadlines trigger automatic escalation, and unresolved issues surface on a public **Hall of Accountability**.

---

## 🧱 Architecture Overview

Sidewalk is built as a scalable **Monorepo** using `pnpm` workspaces, with a clear separation between the API, mobile experience, and shared services.

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React Native (Expo) |
| **Backend API** | Node.js / Express (Modular Monolith) |
| **Database** | MongoDB |
| **Blockchain** | **Stellar** (via `@sidewalk/stellar` package) |
| **Tooling** | `pnpm`, TypeScript, `tsx` |

---

## 📦 Monorepo Structure

```text
sidewalk/
├── apps/
│   ├── api/              # Express backend (Modular Monolith)
│   └── mobile/           # React Native App (Expo)
│
├── packages/
│   └── stellar/          # Shared Stellar Service & SDK
│
├── config/               # Shared configurations
├── package.json          # Root workspace config
└── pnpm-workspace.yaml   # Workspace definitions

```

---

## 🚀 Getting Started

Follow these steps to get the development environment running.

### 1. Prerequisites

* **Node.js** (v18 or higher)
* **pnpm** (Install via `npm install -g pnpm`)
* **MongoDB** (Running locally or via Atlas)
* **Expo Go** app on your phone (optional, for physical device testing)

### 2. Installation

Clone the repo and install dependencies using `pnpm`.

```bash
git clone [https://github.com/your-org/sidewalk.git](https://github.com/your-org/sidewalk.git)
cd sidewalk

# Install all dependencies for all packages
pnpm install

```

### 3. Build Shared Packages

Before running the apps, you must build the shared `@sidewalk/stellar` package so the API can consume it.

```bash
# Build all packages
pnpm -r build

```

### 4. Configure Environment

Set up the environment variables for the API and mobile app.

```bash
# Create the .env file in the API folder
cp apps/api/.env.example apps/api/.env

# Update apps/api/.env with your MongoDB URI (defaults to local)
# MONGO_URI=mongodb://localhost:27017/sidewalk

# Mobile can optionally read its API base URL from Expo public env
cp apps/mobile/.env.example apps/mobile/.env
# EXPO_PUBLIC_API_URL=http://localhost:5000

```

The API now validates its runtime configuration through `apps/api/src/config/env.ts`.
Module-specific config fails with actionable messages when JWT, Stellar, or S3 settings are missing.

---

## 🏃‍♂️ Running the Project

You will typically run the Backend and the Mobile App in two separate terminal tabs.

### Terminal 1: Backend API

This starts the Express server in watch mode.

```bash
# Run from the root directory
npm run dev:api

```

*You should see: `🚀 Server running on port 5000` and `✨ Stellar Service initialized`.*

### Terminal 2: Mobile App

This starts the Expo development server.

```bash
cd apps/mobile
npx expo start

```

* Press `a` to run on **Android Emulator**.
* Press `i` to run on **iOS Simulator**.
* Scan the QR code to run on your physical device.

---

## ✅ Local Quality Checks

Before submitting a PR, run these checks locally to ensure CI will pass:

```bash
# Install dependencies
pnpm install

# Run all checks for a specific package
pnpm --filter sidewalk-api lint && pnpm --filter sidewalk-api typecheck && pnpm --filter sidewalk-api build
pnpm --filter mobile lint && pnpm --filter mobile typecheck
pnpm --filter @sidewalk/stellar lint && pnpm --filter @sidewalk/stellar typecheck && pnpm --filter @sidewalk/stellar build

# Or run checks individually
pnpm --filter <package-name> lint       # Run ESLint
pnpm --filter <package-name> typecheck  # Run TypeScript type checking
pnpm --filter <package-name> build      # Build the package
```

---

## 🤝 Contributing

Sidewalk is open-source and built for contributors who care about civic tech, transparency, and real-world impact.

1. Fork the repository
2. Create a branch from `main`
3. Pick an issue or propose one
4. Open a PR with context and screenshots
5. Ensure CI checks pass before requesting review

---

## 💬 Community & Support

👉 Telegram: [https://t.me/+gRA3CdyekZw3MWM0](https://t.me/+gRA3CdyekZw3MWM0)

---

## 📄 License

MIT License

```

```
