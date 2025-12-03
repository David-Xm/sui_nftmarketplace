import { Request, Response } from "express";
import suiBlockchainService from "../services/sui-blockchain.service";
import suiConfig from "../config/sui.config";

class SuiController {
  /**
   * GET /sui/transaction/:digest
   * Get transaction details from SUI blockchain
   */
  async getTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { digest } = req.params;

      if (!digest) {
        res.status(400).json({
          success: false,
          message: "Transaction digest is required",
        });
        return;
      }

      const transaction = await suiBlockchainService.getTransaction(digest);

      if (transaction) {
        res.status(200).json({
          success: true,
          data: transaction,
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }
    } catch (error) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch transaction",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * GET /sui/events/:eventType
   * Query events from SUI blockchain
   */
  async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const { eventType } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      if (!eventType) {
        res.status(400).json({
          success: false,
          message: "Event type is required",
        });
        return;
      }

      const events = await suiBlockchainService.queryEvents(eventType, limit);

      res.status(200).json({
        success: true,
        data: {
          events,
          total: events.length,
        },
      });
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch events",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * GET /sui/nft/:nftId
   * Get NFT details from SUI blockchain
   */
  async getNFT(req: Request, res: Response): Promise<void> {
    try {
      const { nftId } = req.params;

      if (!nftId) {
        res.status(400).json({
          success: false,
          message: "NFT ID is required",
        });
        return;
      }

      const nft = await suiBlockchainService.getNFTById(nftId);

      if (nft) {
        res.status(200).json({
          success: true,
          data: nft,
        });
      } else {
        res.status(404).json({
          success: false,
          message: "NFT not found",
        });
      }
    } catch (error) {
      console.error("Error fetching NFT:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch NFT",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * GET /sui/config
   * Get SUI blockchain configuration status
   */
  async getConfig(_req: Request, res: Response): Promise<void> {
    try {
      const config = suiConfig.getConfig();
      const isConfigured = suiConfig.isConfigured();

      res.status(200).json({
        success: true,
        data: {
          isConfigured,
          network: config.network,
          rpcUrl: config.rpcUrl,
          packageId: config.packageId || "Not configured",
          moduleName: config.moduleName,
          hasAdminKeypair: !!suiConfig.getAdminKeypair(),
        },
      });
    } catch (error) {
      console.error("Error fetching config:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch configuration",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export default new SuiController();
