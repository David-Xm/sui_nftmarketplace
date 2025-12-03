import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import dotenv from "dotenv";

dotenv.config();

/**
 * SUI Blockchain Configuration
 * This file handles the connection to the SUI network and manages the admin wallet.
 */
class SuiConfig {
  private client: SuiClient;
  private adminKeypair: Ed25519Keypair | null = null;
  private packageId: string;
  private moduleName: string;
  private rpcUrl: string;

  constructor() {
    // Initialize SUI Client connected to Testnet
    // We use getFullnodeUrl("testnet") to get the official public RPC node
    this.rpcUrl = getFullnodeUrl("testnet");
    this.client = new SuiClient({ url: this.rpcUrl });

    // Load environment variables
    this.packageId = process.env.NFT_PACKAGE_ID || "";
    this.moduleName = process.env.NFT_MODULE_NAME || "nft_marketplace";

    // Initialize Admin Keypair if private key is provided
    // This is used for server-side signing (e.g., for the 'buy' endpoint demo)
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    if (privateKey) {
      try {
        // Assuming private key is in hex format or bech32
        // For simplicity, we'll assume it's a standard keypair export
        // In a real app, handle various formats (mnemonics, etc.)
        this.adminKeypair = Ed25519Keypair.fromSecretKey(
          Buffer.from(privateKey, "hex")
        );
      } catch (error) {
        console.warn("Failed to load Admin Private Key:", error);
      }
    }
  }

  /**
   * Get the SUI Client instance
   */
  getClient(): SuiClient {
    return this.client;
  }

  /**
   * Get the Admin Keypair
   */
  getAdminKeypair(): Ed25519Keypair | null {
    return this.adminKeypair;
  }

  /**
   * Get configuration details
   */
  getConfig() {
    return {
      packageId: this.packageId,
      moduleName: this.moduleName,
      network: "testnet",
      rpcUrl: this.rpcUrl,
    };
  }

  /**
   * Check if essential configuration is present
   */
  isConfigured(): boolean {
    return !!this.packageId && !!this.moduleName;
  }
}

export default new SuiConfig();
