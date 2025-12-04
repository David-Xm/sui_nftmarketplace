# SUI NFT Marketplace Backend

A TypeScript-based backend service for an NFT marketplace built with Express and integrated with the SUI blockchain.

## Features

- **TypeScript** - Full type safety and modern JavaScript features
- **Express** - Fast, unopinionated web framework
- **SUI Blockchain Integration** - Real blockchain operations using @mysten/sui.js
- **RESTful API** - Clean and intuitive API design
- **NFT Operations** - Mint, list, and buy NFTs
- **Dual Mode** - Works with in-memory storage (testing) or SUI blockchain (production)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm, yarn, or bun
- (Optional) SUI CLI for smart contract deployment

### Installation

1. Install dependencies:

```bash
bun install
# or
npm install
```

2. Configure environment variables:

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your SUI configuration
# For testing without blockchain, leave NFT_PACKAGE_ID commented out
```

3. Start the development server:

```bash
bun run dev
# or
npm run dev
```

The server will start on `http://localhost:3000`

## SUI Blockchain Integration

### Quick Start (In-Memory Mode)

The backend works out of the box in **in-memory mode** for testing. No blockchain configuration needed!

### Production Mode (SUI Blockchain)

To enable real blockchain transactions:

1. **Deploy your Move smart contract** to SUI (see `INTEGRATION_GUIDE.md`)
2. **Update `.env`** with your package ID:
   ```env
   NFT_PACKAGE_ID=0xYOUR_PACKAGE_ID
   NFT_MODULE_NAME=nft_marketplace
   ```
3. **Restart the server** - it will automatically detect and use the blockchain

See `INTEGRATION_GUIDE.md` for detailed setup instructions.

## API Endpoints

### Health Check

```
GET /health
```

Returns server health status and configuration.

### NFT Marketplace Endpoints

#### Get All Listings

```
GET /api/listings?page=1&limit=10&seller=0x...&minPrice=100&maxPrice=1000
```

**Query Parameters:**

- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10)
- `seller` (optional) - Filter by seller address
- `minPrice` (optional) - Minimum price filter
- `maxPrice` (optional) - Maximum price filter

**Response:**

```json
{
  "success": true,
  "data": {
    "listings": [...],
    "total": 10,
    "page": 1,
    "limit": 10
  }
}
```

#### Get Listing by ID

```
GET /api/listings/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "1",
    "tokenId": "1",
    "name": "Cosmic Dragon #1",
    "description": "A rare cosmic dragon NFT",
    "image": "https://...",
    "price": "100",
    "seller": "0x...",
    "owner": "0x...",
    "isListed": true,
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
}
```

#### Mint NFT

```
POST /api/mint
Content-Type: application/json

{
  "name": "My NFT",
  "description": "A unique NFT",
  "image": "https://...",
  "recipient": "0x..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "tokenId": "3",
    "transactionHash": "0x...",
    "message": "NFT minted successfully"
  }
}
```

#### Buy NFT

```
POST /api/buy
Content-Type: application/json

{
  "listingId": "1",
  "buyer": "0x..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "transactionHash": "0x...",
    "message": "NFT purchased successfully"
  }
}
```

### SUI Blockchain Endpoints

#### Get Transaction Details

```
GET /api/sui/transaction/:digest
```

#### Query Blockchain Events

```
GET /api/sui/events/:eventType?limit=50
```

#### Get NFT from Blockchain

```
GET /api/sui/nft/:nftId
```

#### Check SUI Configuration

```
GET /api/sui/config
```

**Response:**

```json
{
  "success": true,
  "data": {
    "isConfigured": true,
    "network": "devnet",
    "rpcUrl": "https://fullnode.devnet.sui.io:443",
    "packageId": "0x...",
    "moduleName": "nft_marketplace",
    "hasAdminKeypair": false
  }
}
```

## Scripts

- `bun run dev` / `npm run dev` - Start development server with hot reload
- `bun run build` / `npm run build` - Build for production
- `bun start` / `npm start` - Start production server
- `bun test` / `npm test` - Run tests

## Project Structure

```
src/
├── config/              # Configuration files
│   └── sui.config.ts    # SUI blockchain configuration
├── controllers/         # Request handlers
│   ├── nft.controller.ts
│   └── sui.controller.ts
├── services/            # Business logic
│   ├── nft.service.ts
│   └── sui-blockchain.service.ts
├── routes/              # API routes
│   └── nft.routes.ts
├── types/               # TypeScript type definitions
│   └── nft.types.ts
└── index.ts             # Application entry point
```

## Architecture

### Dual-Mode Operation

The backend intelligently switches between two modes:

1. **In-Memory Mode** (Default)

   - No blockchain configuration required
   - Perfect for development and testing
   - Data stored in memory (resets on restart)

2. **SUI Blockchain Mode** (Production)
   - Activated when `NFT_PACKAGE_ID` is configured
   - Real blockchain transactions
   - Persistent data on SUI network

### Service Layer

- **NFTService**: High-level business logic for NFT operations
- **SuiBlockchainService**: Low-level SUI blockchain interactions
- **SuiConfig**: Centralized blockchain configuration management

## Example Usage

### Testing Locally (In-Memory)

```bash
# Start server (no blockchain config needed)
bun run dev

# Mint an NFT
curl -X POST http://localhost:3000/api/mint \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test NFT",
    "description": "Testing",
    "image": "https://example.com/test.png",
    "recipient": "0x123"
  }'

# Get listings
curl http://localhost:3000/api/listings
```

### With SUI Blockchain

```bash
# 1. Deploy your smart contract (see INTEGRATION_GUIDE.md)
# 2. Update .env with NFT_PACKAGE_ID
# 3. Restart server

# Check configuration
curl http://localhost:3000/api/sui/config

# Mint on blockchain (requires ADMIN_PRIVATE_KEY)
curl -X POST http://localhost:3000/api/mint \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Real NFT",
    "description": "On blockchain",
    "image": "https://example.com/nft.png",
    "recipient": "0xREAL_ADDRESS"
  }'
```

## Frontend Integration

This backend is designed to work with frontend applications using:

- **@mysten/dapp-kit** - Official SUI wallet integration
- **@mysten/sui.js** - SUI TypeScript SDK
- Any HTTP client (fetch, axios, etc.)

Example frontend code:

```typescript
import { useSignAndExecuteTransactionBlock } from "@mysten/dapp-kit";

// Mint NFT via backend
const response = await fetch("http://localhost:3000/api/mint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "My NFT",
    description: "Description",
    image: "https://...",
    recipient: walletAddress,
  }),
});

const result = await response.json();
console.log("Minted:", result.data.tokenId);
```

## Limitations

### Custodial Buy Operation

For this demonstration, the `POST /api/buy` endpoint uses a server-side **Admin Wallet** to execute the purchase transaction on the blockchain.

- **In a real-world dApp**: The client (frontend) would construct the transaction and the user would sign it with their own wallet (e.g., Sui Wallet). The backend would only be used for indexing and metadata.
- **Current Implementation**: The server acts as a custodian for the buy operation to simplify the API for this demo.

### Event Indexing

The current event indexing implementation uses a polling mechanism (`setInterval`) to fetch events.

- **Production Recommendation**: For a production-grade application, consider using a dedicated indexer service or a more robust queue-based system to handle event processing reliability and scalability.

## Next Steps

1. ✅ Basic setup complete
2. ⬜ Deploy Move smart contract to SUI
3. ✅ Configure blockchain integration
4. ⬜ Set up database for persistent storage
5. ✅ Implement event indexing
6. ⬜ Add wallet-based authentication
7. ⬜ Add request validation middleware
8. ⬜ Implement rate limiting
9. ⬜ Add comprehensive testing
10. ⬜ Deploy to production

## Documentation

- **INTEGRATION_GUIDE.md** - Detailed SUI blockchain integration guide
- **API Documentation** - This README
- **SUI Docs** - https://docs.sui.io/
- **SUI TypeScript SDK** - https://sdk.mystenlabs.com/typescript

## License

ISC

## Support

For issues or questions:

1. Check `INTEGRATION_GUIDE.md` for SUI-specific help
2. Review the SUI documentation
3. Open an issue in the repository
