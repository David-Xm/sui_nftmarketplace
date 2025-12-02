Architecture Diagram
Description:

Client: Calls backend endpoints to mint, list, or buy NFTs.
Backend: Indexes Sui events, stores listings, exposes API.
Sui Blockchain: Hosts the Move contract, emits events.
Diagram:


+---------+         +---------+         +-----------------+
|  Client | <-----> | Backend | <-----> | Sui Blockchain  |
+---------+         +---------+         +-----------------+
     |                   |                      |
     |  /mint, /buy,     |                      |
     |  /listings        |                      |
     |------------------>|                      |
     |                   |  Mint/List/Buy NFT   |
     |                   |--------------------->|
     |                   |                      |
     |                   |  Event Emission      |
     |                   |<---------------------|
     |                   |                      |
     |  Listings         |                      |
     |<------------------|                      |


README
What i built
A minimal Sui dApp with:

Move contract for minting, listing, and buying NFTs
Backend API to index events and manage listings
Simple REST API for client interaction

How to run:
Deploy Move contract to Sui Testnet (see Sui NFT Example)
Start backend (Node/Nest/FastAPI)
Configure Sui RPC endpoint and DB connection
Run: npm start or python main.py
Use API:
POST /mint to mint NFT
POST /buy to buy NFT
GET /listings to view NFTs for sale

Limitations:
Only basic NFT features (no royalties, no advanced metadata)
No frontend UI (API only)
No authentication or access control
Not production-ready (for demo/learning only)
