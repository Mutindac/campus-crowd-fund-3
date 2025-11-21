# System Architecture & Technical Specification

## Overview

This document provides the architectural blueprint for the Avalanche Crowdfunding dApp designed for Kenya campus projects (robotics clubs, hackathons, charity drives).

---

## 🏛️ High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERFACES                             │
├─────────────────────────────────────────────────────────────────┤
│  Web App (React)  │  Mobile App  │  CLI Tool  │  Direct Contract│
│  • MetaMask       │  • WalletCon │  • Scripts │  • Snowtrace    │
│  • Campaign UI    │  nect        │            │  • Block Expl   │
└────────┬──────────┴──────┬───────┴─────┬──────┴────────┬────────┘
         │                  │              │               │
         └──────────────────┴──────────────┴───────────────┘
                             │
                ┌────────────▼────────────┐
                │   PRESENTATION LAYER    │
                │   ────────────────────  │
                │   • KES Display         │
                │   • AVAX Conversion     │
                │   • Real-time Updates   │
                │   • Responsive Design   │
                └────────────┬────────────┘
                             │ HTTP/REST
                ┌────────────▼────────────┐
                │   APPLICATION LAYER     │
                │   ────────────────────  │
                │   REST API (Express)    │
                │   • Route Handlers      │
                │   • Input Validation    │
                │   • Business Logic      │
                │   • Error Handling      │
                └────────────┬────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐      ┌─────▼──────┐     ┌─────▼──────┐
    │  Price   │      │ Contract   │     │  Event     │
    │  Oracle  │      │ Interaction│     │  Indexer   │
    │ Service  │      │  (ethers)  │     │  Service   │
    └────┬─────┘      └─────┬──────┘     └─────┬──────┘
         │                  │                   │
         └──────────────────┴───────────────────┘
                             │
                ┌────────────▼────────────┐
                │   BLOCKCHAIN LAYER      │
                │   ────────────────────  │
                │  Avalanche C-Chain      │
                │  • EVM Compatible       │
                │  • Fast Finality (~2s)  │
                │  • Low Gas Fees         │
                └────────────┬────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐      ┌─────▼──────┐     ┌─────▼──────┐
    │Crowdfund │      │ Chainlink  │     │   User     │
    │  Escrow  │      │   Oracle   │     │  Wallets   │
    │ Contract │      │  (AVAX/USD)│     │            │
    └──────────┘      └────────────┘     └────────────┘
```

---

## 📦 Module Breakdown

### 1. Smart Contract Layer

**File**: `contracts/CrowdfundingEscrow.sol`

**Responsibilities:**
- Campaign lifecycle management (create, fund, finalize, refund)
- Escrow holding of donated AVAX
- Milestone-based fund releases
- Donor voting mechanism (approval/rejection)
- Automatic refund logic
- Event emission for off-chain indexing

**Key Design Patterns:**
- **Factory Pattern**: CrowdfundFactory creates Campaign instances
- **State Machine**: Campaign states (Active → Funded → Releasing → Finalized)
- **Access Control**: onlyOwner, onlyCampaignCreator, isDonor modifiers
- **Reentrancy Guard**: OpenZeppelin's ReentrancyGuard for safe withdrawals

**Data Structures:**
```solidity
struct Campaign {
    address creator;
    string title;
    string description;
    uint256 goalKES;
    uint256 goalAVAX;
    uint256 deadline;
    uint256 totalDonationsAVAX;
    uint256 conversionRate;
    mapping(uint256 => Milestone) milestones;
    mapping(address => uint256) donations;
    address[] donorList;
}

struct Milestone {
    string description;
    uint256 amountKES;
    uint256 amountAVAX;
    bool released;
    uint256 votesFor;
    uint256 votesAgainst;
    mapping(address => bool) hasVoted;
    string evidenceURI;
}
```

**Gas Optimization:**
- Pack struct variables to fit 32-byte slots
- Use events instead of storage for historical data
- Batch operations where possible (e.g., milestone creation)
- Minimize SSTORE operations (most expensive)

---

### 2. Backend API Layer

**Directory**: `backend/src/`

**Components:**

#### A. Server (`server.js`)
```javascript
import express from 'express';
import cors from 'cors';
import campaignRoutes from './routes/campaigns.js';
import priceRoutes from './routes/price.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/campaigns', campaignRoutes);
app.use('/api/price', priceRoutes);
```

#### B. Price Service (`services/priceService.js`)
**Function**: AVAX ↔ KES Conversion

```javascript
// Oracle Integration Flow
1. Query Chainlink AVAX/USD feed (on-chain)
   └─> https://docs.chain.link/data-feeds/price-feeds/addresses
   
2. Query USD/KES rate (off-chain API)
   └─> exchangerate.host or exchangeratesapi.io
   
3. Calculate: KES_per_AVAX = AVAX_USD_price × USD_KES_rate

4. Cache result (60s TTL) to reduce API calls

5. Fallback to FALLBACK_KES_PER_AVAX if oracles fail
```

**Chainlink Integration:**
```javascript
import { ethers } from 'ethers';

const CHAINLINK_AVAX_USD_FUJI = '0x0A77230d17318075983913bC2145DB16C7366156';

const aggregatorABI = [{
  name: "latestRoundData",
  outputs: [
    { name: "roundId", type: "uint80" },
    { name: "answer", type: "int256" },
    { name: "startedAt", type: "uint256" },
    { name: "updatedAt", type: "uint256" },
    { name: "answeredInRound", type: "uint80" }
  ]
}];

const priceFeed = new ethers.Contract(
  CHAINLINK_AVAX_USD_FUJI,
  aggregatorABI,
  provider
);

const roundData = await priceFeed.latestRoundData();
const avaxUsdPrice = Number(roundData.answer) / 1e8; // 8 decimals
```

#### C. Contract Service (`services/contractService.js`)
**Function**: Smart contract interaction abstraction

```javascript
import { ethers } from 'ethers';
import CrowdfundingEscrowABI from '../abi/CrowdfundingEscrow.json';

class ContractService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.AVALANCHE_RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      CrowdfundingEscrowABI,
      this.wallet
    );
  }

  async createCampaign(params) {
    const tx = await this.contract.createCampaign(
      params.title,
      params.description,
      params.goalKES,
      params.goalAVAX,
      params.conversionRate,
      params.deadline,
      params.milestoneDescriptions,
      params.milestoneAmountsKES,
      params.milestoneAmountsAVAX
    );
    
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === 'CampaignCreated');
    return event.args.campaignId;
  }

  async donate(campaignId, amountAVAX) {
    const tx = await this.contract.donate(campaignId, {
      value: ethers.parseEther(amountAVAX)
    });
    return await tx.wait();
  }

  // ... other methods
}
```

#### D. Validation Middleware (`middleware/validation.js`)
```javascript
import { z } from 'zod';

const campaignSchema = z.object({
  creator: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(500),
  goalKES: z.number().positive().max(100000000), // 100M KES max
  deadline: z.number().refine(d => d > Date.now() / 1000),
  milestones: z.array(z.object({
    description: z.string().min(5),
    amountKES: z.number().positive()
  })).min(1).max(10)
});

export const validateCampaign = (req, res, next) => {
  try {
    campaignSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: error.errors });
  }
};
```

---

### 3. Frontend Layer

**Directory**: `src/`

**Tech Stack:**
- React 18 (functional components + hooks)
- TypeScript (type safety)
- TanStack Query (data fetching & caching)
- Shadcn UI (component library)
- Tailwind CSS (styling)
- React Router (navigation)

**Page Structure:**

```
src/pages/
├── Index.tsx               # Campaign listing
├── CampaignDetail.tsx      # Single campaign view
├── CreateCampaign.tsx      # Campaign creation form
└── NotFound.tsx            # 404 page

src/components/
├── CampaignCard.tsx        # Campaign preview card
├── MilestoneCard.tsx       # Milestone with voting UI
├── DonationForm.tsx        # Donation input
└── ui/                     # Shadcn components
```

**State Management:**

```typescript
// Custom hooks for data fetching
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Campaign list
const useCampaigns = () => {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: api.getCampaigns,
    refetchInterval: 30000 // 30s
  });
};

// Single campaign with milestones
const useCampaign = (id: number) => {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.getCampaign(id),
    refetchInterval: 15000 // 15s
  });
};

// Donation mutation
const useDonate = () => {
  return useMutation({
    mutationFn: ({ campaignId, donor, amountKES }) => 
      api.donate(campaignId, donor, amountKES),
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      toast.success('Donation successful!');
    }
  });
};
```

**Wallet Integration (MetaMask):**

```typescript
// src/lib/wallet.ts
import { ethers } from 'ethers';

export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  // Request account access
  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts'
  });

  // Check network
  const chainId = await window.ethereum.request({ 
    method: 'eth_chainId' 
  });
  
  if (chainId !== '0xA869') { // 43113 Fuji
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xA869' }]
    });
  }

  return {
    address: accounts[0],
    provider: new ethers.BrowserProvider(window.ethereum)
  };
};

export const sendDonation = async (
  contractAddress: string,
  campaignId: number,
  amountAVAX: string
) => {
  const { provider } = await connectWallet();
  const signer = await provider.getSigner();
  
  const contract = new ethers.Contract(
    contractAddress,
    CrowdfundingEscrowABI,
    signer
  );

  const tx = await contract.donate(campaignId, {
    value: ethers.parseEther(amountAVAX)
  });

  return await tx.wait();
};
```

---

## 🔄 Data Flow Diagrams

### Campaign Creation Flow

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│  User   │                │ Backend │                │ Contract │
└────┬────┘                └────┬────┘                └────┬─────┘
     │                          │                          │
     │ POST /api/campaigns      │                          │
     │ {goalKES: 500000, ...}   │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │ 1. Get AVAX/KES rate    │
     │                          │ from oracles             │
     │                          │                          │
     │                          │ 2. Calculate goalAVAX   │
     │                          │    = 500000/146500      │
     │                          │    = 3.413 AVAX         │
     │                          │                          │
     │                          │ 3. createCampaign()     │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │                  CampaignCreated
     │                          │                  event emitted
     │                          │<─────────────────────────┤
     │                          │                          │
     │   Response:              │                          │
     │   {campaignId: 0,        │                          │
     │    goalAVAX: "3.413"}    │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
```

### Donation Flow

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│  Donor  │                │ Backend │                │ Contract │
└────┬────┘                └────┬────┘                └────┬─────┘
     │                          │                          │
     │ POST /api/campaigns/0/   │                          │
     │ donate {amountKES: 50k}  │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │ 1. Convert KES to AVAX  │
     │                          │    50000/146500 = 0.341 │
     │                          │                          │
     │   Instructions:          │                          │
     │   "Send 0.341 AVAX"      │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │ MetaMask: donate()       │                          │
     │ {value: 0.341 AVAX}      │                          │
     ├──────────────────────────────────────────────────────>│
     │                          │                          │
     │                          │               DonationReceived
     │                          │               event emitted
     │<──────────────────────────────────────────────────────┤
     │                          │                          │
     │ Receipt: TX hash         │                          │
     │                          │                          │
```

### Milestone Approval Flow

```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐
│ Creator │  │ Donor 1 │  │ Donor 2 │  │ Backend │  │ Contract │
└────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬─────┘
     │            │            │            │            │
     │ Propose    │            │            │            │
     │ Milestone 0│            │            │            │
     │ + Evidence │            │            │            │
     ├─────────────────────────────────────────────────────>│
     │            │            │            │  MilestoneProposed
     │            │            │            │  event
     │            │            │            │            │
     │            │ Vote YES   │            │            │
     │            ├────────────────────────────────────────>│
     │            │            │            │  VoteCast  │
     │            │            │            │            │
     │            │            │ Vote YES   │            │
     │            │            ├───────────────────────────>│
     │            │            │            │  VoteCast  │
     │            │            │            │            │
     │            │            │            │ Check votes│
     │            │            │            │ 2/2 = 100% │
     │            │            │            │ > 50% ✓    │
     │            │            │            │            │
     │ Finalize   │            │            │            │
     ├─────────────────────────────────────────────────────>│
     │            │            │            │            │
     │            │            │            │ Transfer   │
     │            │            │            │ 2.048 AVAX │
     │            │            │            │ to creator │
     │<──────────────────────────────────────────────────────┤
     │            │            │            │            │
     │ Balance    │            │            │ MilestoneFin│
     │ +2.048 AVAX│            │            │ alized event│
```

---

## 🔒 Security Architecture

### Threat Model

**1. Smart Contract Threats:**

| Threat | Mitigation | Priority |
|--------|-----------|----------|
| Reentrancy attack on withdrawals | ReentrancyGuard pattern | Critical |
| Integer overflow/underflow | Solidity 0.8+ built-in checks | Critical |
| Front-running of votes | Vote encryption (future) | Medium |
| Oracle manipulation | Rate locking at creation | High |
| Griefing (blocking releases) | Minimum quorum requirement | Medium |
| Unauthorized fund release | Multi-level access control | Critical |

**2. Backend API Threats:**

| Threat | Mitigation | Priority |
|--------|-----------|----------|
| SQL Injection | N/A (no database, blockchain only) | - |
| DDoS | Rate limiting, Cloudflare | High |
| API key exposure | Environment variables, never in code | Critical |
| CORS attacks | Whitelist frontend domains | Medium |
| Input validation bypass | Zod schema validation | High |

**3. Frontend Threats:**

| Threat | Mitigation | Priority |
|--------|-----------|----------|
| XSS attacks | React auto-escaping, no dangerouslySetInnerHTML | High |
| Phishing | Display contract address, verify on Snowtrace | Medium |
| Man-in-the-middle | HTTPS only, HSTS headers | Critical |
| Wallet draining | User approval required per transaction | Critical |

### Defense in Depth

```
Layer 1: Smart Contract
├─ Access Control (onlyOwner, modifiers)
├─ Input Validation (require statements)
├─ ReentrancyGuard
└─ Rate Locking (prevent oracle manipulation)

Layer 2: Backend API
├─ Input Validation (Zod schemas)
├─ Rate Limiting (express-rate-limit)
├─ CORS Policy (whitelist domains)
├─ Environment Variables (no secrets in code)
└─ Error Sanitization (no stack traces to client)

Layer 3: Frontend
├─ HTTPS Only
├─ Content Security Policy (CSP)
├─ React Auto-Escaping
├─ MetaMask Signature Verification
└─ Transaction Preview (show exact amounts)

Layer 4: Infrastructure
├─ DDoS Protection (Cloudflare)
├─ SSL/TLS Certificates
├─ Firewall Rules
└─ Monitoring & Alerts
```

---

## 📊 Performance Considerations

### Blockchain Performance

**Avalanche C-Chain Metrics:**
- Block time: ~2 seconds
- Transaction finality: 1-2 seconds
- Gas price: ~25 nAVAX (0.000000025 AVAX)
- Throughput: 4,500 TPS

**Gas Optimization:**
```solidity
// Before: Multiple SSTORE operations
milestones[0].description = "Buy parts";
milestones[0].amountKES = 300000;
milestones[0].amountAVAX = ethers.parseEther("2.048");

// After: Single struct initialization
milestones[0] = Milestone({
    description: "Buy parts",
    amountKES: 300000,
    amountAVAX: ethers.parseEther("2.048"),
    // ... other fields
});
```

### API Performance

**Caching Strategy:**
```javascript
// Price data cache (60s TTL)
const priceCache = new Map();

export async function getAVAXtoKESRate() {
  const cacheKey = 'avax_kes_rate';
  const cached = priceCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.data;
  }
  
  const data = await fetchPriceFromOracles();
  priceCache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}
```

**Database (Future Enhancement):**
```
PostgreSQL Schema for Event Indexing:

CREATE TABLE campaigns (
    id INTEGER PRIMARY KEY,
    creator VARCHAR(42),
    title VARCHAR(100),
    goal_kes BIGINT,
    goal_avax DECIMAL(18,18),
    deadline BIGINT,
    created_at TIMESTAMP,
    INDEX idx_creator (creator),
    INDEX idx_deadline (deadline)
);

CREATE TABLE donations (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id),
    donor VARCHAR(42),
    amount_avax DECIMAL(18,18),
    amount_kes BIGINT,
    tx_hash VARCHAR(66) UNIQUE,
    block_number BIGINT,
    timestamp TIMESTAMP,
    INDEX idx_campaign (campaign_id),
    INDEX idx_donor (donor)
);
```

---

## 🚀 Scalability & Future Enhancements

### Phase 2 Features

1. **Recurring Donations**
   - Subscription model
   - Monthly auto-donations
   - Loyalty rewards

2. **Multi-Currency Support**
   - Accept USDC, USDT stablecoins
   - Multi-token voting weight
   - Automated swaps via DEX integration

3. **Social Features**
   - Campaign comments
   - Creator updates feed
   - Donor leaderboard
   - Share on social media

4. **Advanced Governance**
   - Weighted voting by donation amount
   - Quadratic voting
   - Delegation of votes
   - Multi-sig creator wallets

5. **Analytics Dashboard**
   - Campaign performance metrics
   - Donor demographics
   - Conversion funnel
   - Real-time charts

### Infrastructure Scaling

```
Current (MVP):
- Fuji Testnet
- Single contract
- REST API server
- React SPA

Scaled (Production):
- Avalanche Mainnet
- Multiple contract instances (sharding)
- GraphQL API with Apollo Federation
- CDN for static assets (CloudFlare)
- Redis caching layer
- PostgreSQL event indexing
- Elasticsearch for search
- Load balancer (Nginx)
- Kubernetes deployment
```

---

## 📝 Development Guidelines

### Code Standards

**Solidity:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Use NatSpec comments
/// @title CrowdfundingEscrow
/// @notice Manages campaigns with milestone-based fund releases
/// @dev Implements ReentrancyGuard for safe withdrawals

contract CrowdfundingEscrow {
    // Constants in UPPER_CASE
    uint256 public constant VOTE_THRESHOLD_PERCENT = 50;
    
    // Events use past tense
    event CampaignCreated(uint256 indexed campaignId, address creator);
    
    // Internal functions prefixed with underscore
    function _calculateAVAX(uint256 _amountKES) internal view returns (uint256) {
        // ...
    }
}
```

**TypeScript:**
```typescript
// Use explicit types
interface Campaign {
  campaignId: number;
  creator: string;
  title: string;
  // ...
}

// Use async/await over promises
const getCampaign = async (id: number): Promise<Campaign> => {
  const response = await fetch(`/api/campaigns/${id}`);
  return response.json();
};

// Use optional chaining
const progress = campaign?.progress ?? 0;
```

### Testing Strategy

**Unit Tests (100% coverage target):**
```bash
# Contract tests
npx hardhat test test/CrowdfundingEscrow.test.js

# Backend tests
npm test -- --coverage

# Frontend tests
npm run test:ui
```

**Integration Tests:**
```bash
# End-to-end flow
npx hardhat run scripts/integration-test.js --network fuji
```

**Load Testing:**
```bash
# API load test (Apache Bench)
ab -n 1000 -c 10 http://localhost:3001/api/campaigns

# Contract stress test (Hardhat)
npx hardhat run scripts/stress-test.js
```

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-01-21  
**Maintainer**: Avalanche Campus Crowdfunding Team
