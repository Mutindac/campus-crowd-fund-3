# Backend REST API Documentation

## Overview
Node.js/Express REST API for interacting with the CrowdfundingEscrow smart contract on Avalanche C-Chain. Handles AVAX↔KES conversion, contract interaction, and provides a clean HTTP interface.

## Architecture

```
┌─────────────────┐
│  Frontend/CLI   │
└────────┬────────┘
         │ HTTP REST
┌────────▼────────┐
│   Express API   │
├─────────────────┤
│ • Conversion    │
│ • Validation    │
│ • Contract ABI  │
└────────┬────────┘
         │ ethers.js
┌────────▼────────┐
│ Avalanche C-Chain│
│  Smart Contract │
└─────────────────┘
```

## Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Blockchain**: ethers.js v6
- **Validation**: Zod
- **Price Feed**: Chainlink (AVAX/USD) + exchangerate.host (USD/KES)
- **Environment**: dotenv

## Installation

```bash
cd backend
npm install
```

### Dependencies (package.json)
```json
{
  "name": "avalanche-crowdfunding-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ethers": "^6.9.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "axios": "^1.6.2",
    "zod": "^3.22.4",
    "@chainlink/contracts": "^0.8.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0"
  }
}
```

## Environment Variables (.env)

```bash
# Avalanche RPC
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NETWORK=fuji  # or 'mainnet'

# Contract Address (after deployment)
CONTRACT_ADDRESS=0x...

# Private Key (for contract interaction - use a wallet with test AVAX)
PRIVATE_KEY=0x...

# Price API (optional - has free tier)
EXCHANGE_RATE_API_KEY=your_key_here

# Fallback Conversion Rate (if API unavailable)
FALLBACK_KES_PER_AVAX=146500

# Server Config
PORT=3001
NODE_ENV=development
```

## API Endpoints

### 1. Get AVAX↔KES Conversion Rate

```bash
GET /api/price/avax-kes
```

**Response:**
```json
{
  "KES_per_AVAX": 146500,
  "AVAX_per_KES": 0.00000683,
  "timestamp": 1703001234,
  "sources": {
    "AVAX_USD": "chainlink",
    "USD_KES": "exchangerate.host"
  },
  "AVAX_USD_price": 35.50,
  "USD_KES_rate": 4126.76
}
```

**cURL Example:**
```bash
curl http://localhost:3001/api/price/avax-kes
```

### 2. Create Campaign

```bash
POST /api/campaigns
Content-Type: application/json
```

**Request Body:**
```json
{
  "creator": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "title": "Robotics Club Equipment Fund",
  "description": "Raise funds to purchase robotics parts for the national competition",
  "goalKES": 500000,
  "deadline": 1735689600,
  "milestones": [
    {
      "description": "Purchase robotics parts and components",
      "amountKES": 300000
    },
    {
      "description": "Travel and accommodation for competition",
      "amountKES": 200000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaignId": 0,
    "transactionHash": "0xabc123...",
    "contractAddress": "0x...",
    "campaign": {
      "creator": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "title": "Robotics Club Equipment Fund",
      "description": "Raise funds to purchase robotics parts for the national competition",
      "goalKES": 500000,
      "goalAVAX": "3.412969283276",
      "deadline": 1735689600,
      "milestones": [
        {
          "description": "Purchase robotics parts and components",
          "amountKES": 300000,
          "amountAVAX": "2.047781569966"
        },
        {
          "description": "Travel and accommodation for competition",
          "amountKES": 200000,
          "amountAVAX": "1.365187713310"
        }
      ],
      "conversion": {
        "KES_per_AVAX": 146500,
        "timestamp": 1703001234
      }
    }
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "creator": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "title": "Robotics Club Equipment Fund",
    "description": "Raise funds to purchase robotics parts",
    "goalKES": 500000,
    "deadline": 1735689600,
    "milestones": [
      {"description": "Buy parts", "amountKES": 300000},
      {"description": "Travel costs", "amountKES": 200000}
    ]
  }'
```

### 3. List All Campaigns

```bash
GET /api/campaigns?page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "campaignId": 0,
        "creator": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        "title": "Robotics Club Equipment Fund",
        "description": "Raise funds to purchase robotics parts",
        "goalKES": 500000,
        "goalAVAX": "3.412969283276",
        "totalDonationsAVAX": "2.5",
        "totalDonationsKES": 366250,
        "progress": 73.25,
        "deadline": 1735689600,
        "daysRemaining": 28,
        "goalReached": false,
        "donorCount": 5,
        "milestonesCount": 2
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3001/api/campaigns
```

### 4. Get Campaign Details

```bash
GET /api/campaigns/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaign": {
      "campaignId": 0,
      "creator": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "title": "Robotics Club Equipment Fund",
      "description": "Raise funds to purchase robotics parts",
      "goalKES": 500000,
      "goalAVAX": "3.412969283276",
      "totalDonationsAVAX": "2.5",
      "totalDonationsKES": 366250,
      "conversionRate": 146500,
      "conversionTimestamp": 1703001234,
      "deadline": 1735689600,
      "goalReached": false,
      "finalized": false,
      "donorCount": 5,
      "milestonesCount": 2
    },
    "milestones": [
      {
        "index": 0,
        "description": "Purchase robotics parts and components",
        "amountKES": 300000,
        "amountAVAX": "2.047781569966",
        "released": false,
        "votesFor": 3,
        "votesAgainst": 1,
        "evidenceURI": "ipfs://QmExample123",
        "proposedAt": 1703100000,
        "voteProgress": {
          "totalVotes": 4,
          "quorumReached": true,
          "approvalPercent": 75,
          "canFinalize": true
        }
      },
      {
        "index": 1,
        "description": "Travel and accommodation for competition",
        "amountKES": 200000,
        "amountAVAX": "1.365187713310",
        "released": false,
        "votesFor": 0,
        "votesAgainst": 0,
        "evidenceURI": "",
        "proposedAt": 0,
        "voteProgress": {
          "totalVotes": 0,
          "quorumReached": false,
          "approvalPercent": 0,
          "canFinalize": false
        }
      }
    ],
    "donations": [
      {
        "donor": "0x123...",
        "amountAVAX": "1.0",
        "amountKES": 146500,
        "timestamp": 1703050000,
        "transactionHash": "0xabc..."
      }
    ]
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3001/api/campaigns/0
```

### 5. Donate to Campaign

```bash
POST /api/campaigns/:id/donate
Content-Type: application/json
```

**Request Body:**
```json
{
  "donor": "0x123...",
  "amountKES": 50000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xdef456...",
    "donor": "0x123...",
    "amountAVAX": "0.341296928328",
    "amountKES": 50000,
    "campaignId": 0,
    "totalDonationsAVAX": "2.841296928328",
    "newProgress": 83.25,
    "message": "Please send 0.341296928328 AVAX to complete donation"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/campaigns/0/donate \
  -H "Content-Type: application/json" \
  -d '{"donor": "0x123...", "amountKES": 50000}'
```

### 6. Propose Milestone Release

```bash
POST /api/campaigns/:id/milestones/:milestoneIndex/propose
Content-Type: application/json
```

**Request Body:**
```json
{
  "creator": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "evidenceURI": "ipfs://QmExampleHash123/evidence.pdf"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xghi789...",
    "campaignId": 0,
    "milestoneIndex": 0,
    "evidenceURI": "ipfs://QmExampleHash123/evidence.pdf",
    "proposedAt": 1703100000
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/campaigns/0/milestones/0/propose \
  -H "Content-Type: application/json" \
  -d '{
    "creator": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "evidenceURI": "ipfs://QmExampleHash123/evidence.pdf"
  }'
```

### 7. Vote on Milestone

```bash
POST /api/campaigns/:id/milestones/:milestoneIndex/vote
Content-Type: application/json
```

**Request Body:**
```json
{
  "voter": "0x123...",
  "approve": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xjkl012...",
    "campaignId": 0,
    "milestoneIndex": 0,
    "voter": "0x123...",
    "approve": true,
    "votesFor": 4,
    "votesAgainst": 1,
    "totalVotes": 5,
    "approvalPercent": 80,
    "quorumReached": true,
    "canFinalize": true
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/campaigns/0/milestones/0/vote \
  -H "Content-Type: application/json" \
  -d '{"voter": "0x123...", "approve": true}'
```

### 8. Finalize Milestone

```bash
POST /api/campaigns/:id/milestones/:milestoneIndex/finalize
Content-Type: application/json
```

**Request Body:**
```json
{
  "caller": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xmno345...",
    "campaignId": 0,
    "milestoneIndex": 0,
    "amountAVAX": "2.047781569966",
    "amountKES": 300000,
    "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "released": true
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/campaigns/0/milestones/0/finalize \
  -H "Content-Type: application/json" \
  -d '{"caller": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

### 9. Request Refund

```bash
POST /api/campaigns/:id/refund
Content-Type: application/json
```

**Request Body:**
```json
{
  "donor": "0x123..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xpqr678...",
    "campaignId": 0,
    "donor": "0x123...",
    "refundedAVAX": "1.0",
    "refundedKES": 146500
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/campaigns/0/refund \
  -H "Content-Type: application/json" \
  -d '{"donor": "0x123..."}'
```

## Server Implementation

### Main Server (src/server.js)
```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import campaignRoutes from './routes/campaigns.js';
import priceRoutes from './routes/price.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/campaigns', campaignRoutes);
app.use('/api/price', priceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Network: ${process.env.NETWORK}`);
  console.log(`📝 Contract: ${process.env.CONTRACT_ADDRESS}`);
});
```

## Price Conversion Service (src/services/priceService.js)

```javascript
import axios from 'axios';
import { ethers } from 'ethers';

const CHAINLINK_AVAX_USD_FEED = '0x0A77230d17318075983913bC2145DB16C7366156'; // Fuji
const EXCHANGE_RATE_API = 'https://api.exchangerate.host/latest';
const FALLBACK_KES_PER_AVAX = parseFloat(process.env.FALLBACK_KES_PER_AVAX) || 146500;

export async function getAVAXtoKESRate() {
  try {
    // Get AVAX/USD from Chainlink
    const avaxUsdPrice = await getAVAXUSDPrice();
    
    // Get USD/KES from exchange API
    const usdKesRate = await getUSDtoKESRate();
    
    const kesPerAvax = avaxUsdPrice * usdKesRate;
    
    return {
      KES_per_AVAX: kesPerAvax,
      AVAX_per_KES: 1 / kesPerAvax,
      timestamp: Math.floor(Date.now() / 1000),
      sources: {
        AVAX_USD: 'chainlink',
        USD_KES: 'exchangerate.host'
      },
      AVAX_USD_price: avaxUsdPrice,
      USD_KES_rate: usdKesRate
    };
  } catch (error) {
    console.warn('Price API failed, using fallback:', error.message);
    return {
      KES_per_AVAX: FALLBACK_KES_PER_AVAX,
      AVAX_per_KES: 1 / FALLBACK_KES_PER_AVAX,
      timestamp: Math.floor(Date.now() / 1000),
      sources: {
        AVAX_USD: 'fallback',
        USD_KES: 'fallback'
      },
      AVAX_USD_price: 35.0,
      USD_KES_rate: 4186.0
    };
  }
}

async function getAVAXUSDPrice() {
  const provider = new ethers.JsonRpcProvider(process.env.AVALANCHE_RPC_URL);
  
  const aggregatorV3InterfaceABI = [
    {
      inputs: [],
      name: "latestRoundData",
      outputs: [
        { name: "roundId", type: "uint80" },
        { name: "answer", type: "int256" },
        { name: "startedAt", type: "uint256" },
        { name: "updatedAt", type: "uint256" },
        { name: "answeredInRound", type: "uint80" }
      ],
      stateMutability: "view",
      type: "function"
    }
  ];
  
  const priceFeed = new ethers.Contract(
    CHAINLINK_AVAX_USD_FEED,
    aggregatorV3InterfaceABI,
    provider
  );
  
  const roundData = await priceFeed.latestRoundData();
  const price = Number(roundData.answer) / 1e8; // Chainlink uses 8 decimals
  
  return price;
}

async function getUSDtoKESRate() {
  const response = await axios.get(EXCHANGE_RATE_API, {
    params: {
      base: 'USD',
      symbols: 'KES'
    }
  });
  
  return response.data.rates.KES;
}

export function convertKEStoAVAX(amountKES, kesPerAvax) {
  return (amountKES / kesPerAvax).toString();
}

export function convertAVAXtoKES(amountAVAX, kesPerAvax) {
  return Math.floor(parseFloat(amountAVAX) * kesPerAvax);
}
```

## Running the Demo

### Step 1: Setup
```bash
# Install dependencies
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values
```

### Step 2: Deploy Contract (if not deployed)
```bash
cd ../contracts
npx hardhat run scripts/deploy.js --network fuji
# Copy contract address to backend/.env
```

### Step 3: Start Backend
```bash
cd ../backend
npm run dev
```

### Step 4: Test Endpoints
```bash
# Check price conversion
curl http://localhost:3001/api/price/avax-kes

# Create campaign
curl -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -d @examples/create-campaign.json

# List campaigns
curl http://localhost:3001/api/campaigns
```

## Postman Collection

Import the provided `Avalanche-Crowdfunding.postman_collection.json` file into Postman for a complete set of pre-configured requests with example payloads.

## Error Handling

All endpoints return errors in this format:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Goal amount must be greater than 0",
    "details": {}
  }
}
```

## Security Notes
- Never expose private keys in code or version control
- Use environment variables for all sensitive data
- Implement rate limiting in production
- Add API key authentication for production deployment
- Validate all input data with Zod schemas
- Use HTTPS in production
- Implement request signing for contract interactions
