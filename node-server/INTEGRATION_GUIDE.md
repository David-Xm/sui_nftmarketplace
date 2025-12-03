# SUI Blockchain Integration Guide

This guide explains how to integrate your NFT marketplace backend with the SUI blockchain.

## Overview

The backend now supports two modes:

1. **In-memory mode** - For testing without blockchain (default)
2. **SUI blockchain mode** - For production with real blockchain transactions

## Configuration

### 1. Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Basic Configuration
PORT=3000
NODE_ENV=development

# SUI Network (mainnet, testnet, devnet, localnet)
SUI_NETWORK=devnet
SUI_RPC_URL=https://fullnode.devnet.sui.io:443

# Your deployed smart contract
NFT_PACKAGE_ID=0xYOUR_PACKAGE_ID_HERE
NFT_MODULE_NAME=nft_marketplace

# Optional: For server-side minting
ADMIN_PRIVATE_KEY=suiprivkey...
```

### 2. Deploy Your Smart Contract

You need to deploy a Move smart contract to SUI. Here's a basic structure:

```move
module nft_marketplace::nft_marketplace {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::string::String;

    // NFT struct
    struct NFT has key, store {
        id: UID,
        name: String,
        description: String,
        url: String,
    }

    // Listing struct
    struct Listing has key, store {
        id: UID,
        nft_id: address,
        price: u64,
        seller: address,
        is_active: bool,
    }

    // Mint a new NFT
    public entry fun mint(
        name: String,
        description: String,
        url: String,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let nft = NFT {
            id: object::new(ctx),
            name,
            description,
            url,
        };
        transfer::public_transfer(nft, recipient);
    }

    // List an NFT for sale
    public entry fun list(
        nft: NFT,
        price: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let nft_id = object::id_address(&nft);

        let listing = Listing {
            id: object::new(ctx),
            nft_id,
            price,
            seller: sender,
            is_active: true,
        };

        // Transfer NFT to marketplace (escrow)
        transfer::public_transfer(nft, @marketplace_address);
        transfer::share_object(listing);
    }

    // Buy an NFT
    public entry fun buy(
        listing: &mut Listing,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // Implementation for buying
        // Transfer payment to seller
        // Transfer NFT to buyer
        // Mark listing as inactive
    }
}
```

### 3. Deploy the Contract

```bash
# Build the contract
sui move build

# Deploy to devnet
sui client publish --gas-budget 100000000

# Note the Package ID from the output
```

### 4. Update Environment Variables

After deployment, update your `.env` file with the Package ID:

```env
NFT_PACKAGE_ID=0x<your_package_id_from_deployment>
```

## API Endpoints

### Standard Endpoints

These work in both modes:

#### Get Listings

```bash
GET /api/listings?page=1&limit=10
```

#### Mint NFT

```bash
POST /api/mint
Content-Type: application/json

{
  "name": "My NFT",
  "description": "A unique NFT",
  "image": "https://example.com/image.png",
  "recipient": "0x..."
}
```

#### Buy NFT

```bash
POST /api/buy
Content-Type: application/json

{
  "listingId": "0x...",
  "buyer": "0x..."
}
```

### SUI-Specific Endpoints

These provide direct blockchain access:

#### Get Transaction Details

```bash
GET /api/sui/transaction/:digest
```

#### Query Events

```bash
GET /api/sui/events/:eventType?limit=50
```

#### Get NFT from Blockchain

```bash
GET /api/sui/nft/:nftId
```

#### Check Configuration

```bash
GET /api/sui/config
```

## Frontend Integration

### Using @mysten/dapp-kit (Recommended)

For frontend applications, use the official SUI dApp Kit:

```bash
npm install @mysten/dapp-kit @mysten/sui.js @tanstack/react-query
```

Example React component:

```typescript
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransactionBlock,
} from "@mysten/dapp-kit";
import { TransactionBlock } from "@mysten/sui.js/transactions";

function MintNFT() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  const handleMint = async () => {
    const tx = new TransactionBlock();

    tx.moveCall({
      target: `${PACKAGE_ID}::nft_marketplace::mint`,
      arguments: [
        tx.pure("NFT Name"),
        tx.pure("Description"),
        tx.pure("https://image.url"),
        tx.pure(account.address),
      ],
    });

    signAndExecute(
      {
        transactionBlock: tx,
      },
      {
        onSuccess: (result) => {
          console.log("Minted!", result);
        },
      }
    );
  };

  return (
    <div>
      <ConnectButton />
      {account && <button onClick={handleMint}>Mint NFT</button>}
    </div>
  );
}
```

### Backend as Transaction Builder

Your backend can also build transactions for the frontend to sign:

```typescript
// Backend endpoint to build transaction
app.post("/api/build-mint-tx", (req, res) => {
  const { name, description, image, recipient } = req.body;

  const tx = new TransactionBlock();
  tx.moveCall({
    target: `${packageId}::nft_marketplace::mint`,
    arguments: [
      tx.pure(name),
      tx.pure(description),
      tx.pure(image),
      tx.pure(recipient),
    ],
  });

  res.json({
    transactionBlock: tx.serialize(),
  });
});
```

## Testing

### 1. Check Configuration

```bash
curl http://localhost:3000/api/sui/config
```

### 2. Test In-Memory Mode

Without setting `NFT_PACKAGE_ID`, the backend runs in in-memory mode:

```bash
curl -X POST http://localhost:3000/api/mint \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test NFT",
    "description": "Testing",
    "image": "https://example.com/test.png",
    "recipient": "0x123"
  }'
```

### 3. Test Blockchain Mode

After configuring `NFT_PACKAGE_ID` and `ADMIN_PRIVATE_KEY`:

```bash
curl -X POST http://localhost:3000/api/mint \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Real NFT",
    "description": "On blockchain",
    "image": "https://example.com/nft.png",
    "recipient": "0xREAL_ADDRESS"
  }'
```

## Event Indexing

For production, you should index blockchain events to a database:

```typescript
// Example event indexer
async function indexMarketplaceEvents() {
  const events = await suiBlockchainService.queryEvents("NFTMinted", 100);

  for (const event of events) {
    // Store in database
    await db.nfts.create({
      id: event.parsedJson.nft_id,
      name: event.parsedJson.name,
      // ... other fields
    });
  }
}

// Run periodically
setInterval(indexMarketplaceEvents, 60000); // Every minute
```

## Security Considerations

1. **Never expose private keys** - Use environment variables
2. **Validate all inputs** - Especially addresses and amounts
3. **Rate limiting** - Implement rate limiting for API endpoints
4. **Transaction verification** - Always verify transaction results
5. **Error handling** - Don't expose internal errors to clients

## Next Steps

1. ✅ Deploy your Move smart contract
2. ✅ Configure environment variables
3. ✅ Test with devnet
4. ⬜ Set up database for indexing
5. ⬜ Implement event listeners
6. ⬜ Add authentication
7. ⬜ Deploy to production

## Resources

- [SUI Documentation](https://docs.sui.io/)
- [SUI TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [SUI dApp Kit](https://sdk.mystenlabs.com/dapp-kit)
- [Move Language](https://move-language.github.io/move/)
