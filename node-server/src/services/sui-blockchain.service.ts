import { SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import suiConfig from "../config/sui.config";

export interface NFTObject {
  id: string;
  name: string;
  description: string;
  url: string;
  owner: string;
}

export interface ListingObject {
  id: string;
  nftId: string;
  price: string;
  seller: string;
  isActive: boolean;
}

class SuiBlockchainService {
  private client: SuiClient;
  private packageId: string;
  private moduleName: string;

  constructor() {
    this.client = suiConfig.getClient();
    const config = suiConfig.getConfig();
    this.packageId = config.packageId;
    this.moduleName = config.moduleName;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return suiConfig.isConfigured();
  }

  /**
   * Mint a new NFT on the SUI blockchain
   *
   * @param name Name of the NFT
   * @param description Description of the NFT
   * @param imageUrl URL of the NFT image
   * @param recipientAddress Address to receive the NFT
   */
  async mintNFT(
    name: string,
    description: string,
    imageUrl: string,
    recipientAddress: string
  ): Promise<{
    success: boolean;
    digest?: string;
    nftId?: string;
    error?: string;
  }> {
    try {
      if (!this.isConfigured()) {
        throw new Error(
          "SUI blockchain not configured. Please set NFT_PACKAGE_ID in .env"
        );
      }

      console.log(`Minting NFT for ${recipientAddress}...`);

      const tx = new TransactionBlock();

      // Call the mint function from your smart contract
      // The Move function signature is expected to be:
      // public entry fun mint(name: vector<u8>, description: vector<u8>, url: vector<u8>, recipient: address, ctx: &mut TxContext)
      tx.moveCall({
        target: `${this.packageId}::${this.moduleName}::mint`,
        arguments: [
          tx.pure(name),
          tx.pure(description),
          tx.pure(imageUrl),
          tx.pure(recipientAddress),
        ],
      });

      // We use the Admin Keypair to sign the transaction on behalf of the application
      // In a real dApp, the user would sign this transaction via their wallet
      const adminKeypair = suiConfig.getAdminKeypair();
      if (!adminKeypair) {
        return {
          success: false,
          error:
            "Server-side minting requires ADMIN_PRIVATE_KEY to be configured",
        };
      }

      const result = await this.client.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: adminKeypair,
        options: {
          showEffects: true,
          showObjectChanges: true,
          showEvents: true, // We want to see the MintEvent
        },
      });

      console.log("Mint transaction executed. Digest:", result.digest);

      // Extract the created NFT object ID from the object changes
      const createdObjects = result.objectChanges?.filter(
        (change) => change.type === "created"
      );

      // We assume the first created object is our NFT
      // A more robust way would be to check the object type
      const nftId = createdObjects?.[0]?.objectId;

      return {
        success: true,
        digest: result.digest,
        nftId,
      };
    } catch (error) {
      console.error("Error minting NFT on SUI:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Buy an NFT from a listing
   *
   * @param listingId The Object ID of the listing to buy
   */
  async buyNFT(
    listingId: string
  ): Promise<{ success: boolean; digest?: string; error?: string }> {
    try {
      if (!this.isConfigured()) {
        throw new Error("SUI blockchain not configured");
      }

      console.log(`Buying listing ${listingId}...`);

      const tx = new TransactionBlock();

      // Call the buy function from your smart contract
      // The Move function signature is expected to be:
      // public entry fun buy(listing: &mut Listing, payment: Coin<SUI>, ctx: &mut TxContext)
      // Note: This implementation assumes the contract handles payment internally or takes a Coin object
      // For simplicity in this demo, we are just calling a 'buy' function that might transfer ownership
      // In a real scenario, you'd need to handle Coin splitting and passing the payment object
      tx.moveCall({
        target: `${this.packageId}::${this.moduleName}::buy`,
        arguments: [tx.object(listingId)],
      });

      // Using Admin Keypair for the demo purchase
      const adminKeypair = suiConfig.getAdminKeypair();
      if (!adminKeypair) {
        throw new Error("Admin keypair not configured for buy operation");
      }

      const result = await this.client.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: adminKeypair,
        options: {
          showEffects: true,
          showObjectChanges: true,
          showEvents: true,
        },
      });

      console.log("Buy transaction executed. Digest:", result.digest);

      return {
        success: true,
        digest: result.digest,
      };
    } catch (error) {
      console.error("Error buying NFT on SUI:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Query events from the smart contract
   * This is crucial for indexing the state of the marketplace
   *
   * @param eventType The specific event struct name (e.g., "MintEvent", "ListEvent")
   * @param limit Number of events to fetch
   */
  async queryEvents(eventType: string, limit: number = 50) {
    try {
      if (!this.isConfigured()) {
        return [];
      }

      // Construct the full event type: PackageID::ModuleName::StructName
      const fullEventType = `${this.packageId}::${this.moduleName}::${eventType}`;

      console.log(`Querying events: ${fullEventType}`);

      const events = await this.client.queryEvents({
        query: {
          MoveEventType: fullEventType,
        },
        limit,
        order: "descending", // Get latest events first
      });

      return events.data;
    } catch (error) {
      console.error(`Error querying events ${eventType} from SUI:`, error);
      return [];
    }
  }

  /**
   * Get transaction details by digest
   */
  async getTransaction(digest: string) {
    try {
      return await this.client.getTransactionBlock({
        digest,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showInput: true,
        },
      });
    } catch (error) {
      console.error("Error fetching transaction from SUI:", error);
      return null;
    }
  }

  /**
   * Get NFT details by object ID
   */
  async getNFTById(nftId: string): Promise<NFTObject | null> {
    try {
      const object = await this.client.getObject({
        id: nftId,
        options: {
          showContent: true,
          showOwner: true,
        },
      });

      if (object.data?.content && "fields" in object.data.content) {
        const fields = object.data.content.fields as any;
        const owner = object.data.owner;

        // Parse owner address
        let ownerAddress = "";
        if (owner && typeof owner === "object" && "AddressOwner" in owner) {
          ownerAddress = owner.AddressOwner;
        } else if (owner && typeof owner === "string") {
          ownerAddress = owner;
        }

        return {
          id: object.data.objectId,
          name: fields.name || "",
          description: fields.description || "",
          url: fields.url || "",
          owner: ownerAddress,
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching NFT from SUI:", error);
      return null;
    }
  }
}

export default new SuiBlockchainService();
