import {
  NFTListing,
  MintRequest,
  MintResponse,
  BuyRequest,
  BuyResponse,
  ListingsQuery,
} from "../types/nft.types";
import suiBlockchainService from "./sui-blockchain.service";

class NFTService {
  // In-memory storage for listings
  // We use this to cache the state from the blockchain for faster read access
  private listings: Map<string, NFTListing> = new Map();
  private useSuiBlockchain: boolean = false;
  private indexingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Check if SUI blockchain is configured
    this.useSuiBlockchain = suiBlockchainService.isConfigured();

    if (this.useSuiBlockchain && !this.indexingInterval) {
      console.log("✅ SUI blockchain integration enabled");
      // Start indexing events from the blockchain
      this.startIndexing();
    } else {
      console.log("⚠️  SUI blockchain not configured - please configure .env");
    }
  }

  /**
   * Start the background indexing process
   * This polls the blockchain for new events every 10 seconds
   */
  private startIndexing() {
    console.log("🔄 Starting event indexing...");

    // Initial fetch
    this.indexEvents();

    // Set up interval
    this.indexingInterval = setInterval(() => {
      this.indexEvents();
    }, 10000); // Poll every 10 seconds
  }

  /**
   * Fetch and process events from the blockchain
   */
  private async indexEvents() {
    try {
      // 1. Fetch Mint events
      // Assumes event name is "MintEvent"
      const mintEvents = await suiBlockchainService.queryEvents("MintEvent");

      for (const event of mintEvents) {
        const parsedJson = event.parsedJson as any;
        // Map blockchain event data to our internal structure
        // Adjust field names based on your actual Move event structure
        const tokenId = parsedJson.object_id || parsedJson.id;

        if (tokenId && !this.listings.has(tokenId)) {
          // New NFT found, add to our local state
          this.listings.set(tokenId, {
            id: tokenId,
            tokenId: tokenId,
            name: parsedJson.name || "Unknown NFT",
            description: parsedJson.description || "",
            image: parsedJson.url || parsedJson.image_url || "",
            price: "0", // Not listed yet
            seller: parsedJson.creator || parsedJson.sender,
            owner: parsedJson.recipient || parsedJson.owner,
            isListed: false,
            createdAt: Number(event.timestampMs) || Date.now(),
            updatedAt: Number(event.timestampMs) || Date.now(),
          });
          console.log(`Indexed new NFT: ${tokenId}`);
        }
      }

      // 2. Fetch List events
      // Assumes event name is "ListEvent"
      const listEvents = await suiBlockchainService.queryEvents("ListEvent");

      for (const event of listEvents) {
        const parsedJson = event.parsedJson as any;
        const tokenId = parsedJson.nft_id || parsedJson.object_id;

        if (tokenId && this.listings.has(tokenId)) {
          const listing = this.listings.get(tokenId)!;

          // Update listing status
          if (!listing.isListed) {
            listing.isListed = true;
            listing.price = parsedJson.price;
            listing.seller = parsedJson.seller;
            listing.updatedAt = Number(event.timestampMs) || Date.now();

            this.listings.set(tokenId, listing);
            console.log(
              `Indexed listing for NFT: ${tokenId} at price ${listing.price}`
            );
          }
        }
      }

      // 3. Fetch Buy events
      // Assumes event name is "BuyEvent"
      const buyEvents = await suiBlockchainService.queryEvents("BuyEvent");

      for (const event of buyEvents) {
        const parsedJson = event.parsedJson as any;
        const tokenId = parsedJson.nft_id || parsedJson.object_id;

        if (tokenId && this.listings.has(tokenId)) {
          const listing = this.listings.get(tokenId)!;

          // Update ownership and delist
          if (listing.isListed) {
            listing.isListed = false;
            listing.owner = parsedJson.buyer;
            listing.updatedAt = Number(event.timestampMs) || Date.now();

            this.listings.set(tokenId, listing);
            console.log(`Indexed sale for NFT: ${tokenId} to ${listing.owner}`);
          }
        }
      }
    } catch (error) {
      console.error("Error indexing events:", error);
    }
  }

  /**
   * Get all NFT listings with optional filtering
   */
  async getListings(query: ListingsQuery): Promise<{
    listings: NFTListing[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, seller, minPrice, maxPrice } = query;

    // Convert Map to Array
    let filteredListings = Array.from(this.listings.values()).filter(
      (listing) => listing.isListed
    );

    // Filter by listed status (unless we want to see all NFTs)
    // For a marketplace, we usually only show listed items
    // filteredListings = filteredListings.filter((listing) => listing.isListed);

    // Filter by seller
    if (seller) {
      filteredListings = filteredListings.filter(
        (listing) => listing.seller.toLowerCase() === seller.toLowerCase()
      );
    }

    // Filter by price range
    if (minPrice) {
      filteredListings = filteredListings.filter(
        (listing) => parseFloat(listing.price) >= parseFloat(minPrice)
      );
    }

    if (maxPrice) {
      filteredListings = filteredListings.filter(
        (listing) => parseFloat(listing.price) <= parseFloat(maxPrice)
      );
    }

    // Sort by most recent
    filteredListings.sort((a, b) => b.updatedAt - a.updatedAt);

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedListings = filteredListings.slice(startIndex, endIndex);

    return {
      listings: paginatedListings,
      total: filteredListings.length,
      page,
      limit,
    };
  }

  /**
   * Mint a new NFT
   */
  async mintNFT(mintRequest: MintRequest): Promise<MintResponse> {
    try {
      if (!this.useSuiBlockchain) {
        return {
          success: false,
          message: "SUI blockchain not configured",
        };
      }

      // Execute mint transaction on blockchain
      const result = await suiBlockchainService.mintNFT(
        mintRequest.name,
        mintRequest.description,
        mintRequest.image,
        mintRequest.recipient
      );

      if (!result.success) {
        return {
          success: false,
          message: result.error || "Failed to mint NFT",
        };
      }

      // Note: We don't immediately add to local state here
      // We wait for the event indexer to pick it up to ensure consistency
      // However, for better UX, we could optimistically add it

      return {
        success: true,
        tokenId: result.nftId || "pending",
        transactionHash: result.digest || "",
        message: "NFT mint transaction submitted successfully",
      };
    } catch (error) {
      console.error("Error minting NFT:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to mint NFT",
      };
    }
  }

  /**
   * Buy an NFT
   */
  async buyNFT(buyRequest: BuyRequest): Promise<BuyResponse> {
    try {
      if (!this.useSuiBlockchain) {
        return {
          success: false,
          message: "SUI blockchain not configured",
        };
      }

      // Execute buy transaction on blockchain
      const result = await suiBlockchainService.buyNFT(buyRequest.listingId);

      if (!result.success) {
        return {
          success: false,
          message: result.error || "Failed to buy NFT",
        };
      }

      return {
        success: true,
        transactionHash: result.digest || "",
        message: "NFT purchase transaction submitted successfully",
      };
    } catch (error) {
      console.error("Error buying NFT:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to buy NFT",
      };
    }
  }

  /**
   * Get a single listing by ID
   */
  async getListingById(id: string): Promise<NFTListing | null> {
    return this.listings.get(id) || null;
  }
}

export default new NFTService();
