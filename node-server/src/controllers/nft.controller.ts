import { Request, Response } from "express";
import nftService from "../services/nft.service";
import { MintRequest, BuyRequest, ListingsQuery } from "../types/nft.types";

class NFTController {
  /**
   * GET /listings
   * Retrieve all NFT listings with optional filtering
   */
  async getListings(req: Request, res: Response): Promise<void> {
    try {
      const query: ListingsQuery = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        seller: req.query.seller as string,
        minPrice: req.query.minPrice as string,
        maxPrice: req.query.maxPrice as string,
      };

      const result = await nftService.getListings(query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch listings",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * POST /mint
   * Mint a new NFT
   */
  async mintNFT(req: Request, res: Response): Promise<void> {
    try {
      const mintRequest: MintRequest = req.body;

      // Validate request
      if (
        !mintRequest.name ||
        !mintRequest.description ||
        !mintRequest.image ||
        !mintRequest.recipient
      ) {
        res.status(400).json({
          success: false,
          message:
            "Missing required fields: name, description, image, recipient",
        });
        return;
      }

      const result = await nftService.mintNFT(mintRequest);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error minting NFT:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mint NFT",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * POST /buy
   * Purchase an NFT
   */
  async buyNFT(req: Request, res: Response): Promise<void> {
    try {
      const buyRequest: BuyRequest = req.body;

      // Validate request
      if (!buyRequest.listingId || !buyRequest.buyer) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: listingId, buyer",
        });
        return;
      }

      const result = await nftService.buyNFT(buyRequest);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error buying NFT:", error);
      res.status(500).json({
        success: false,
        message: "Failed to buy NFT",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * GET /listings/:id
   * Get a specific listing by ID
   */
  async getListingById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const listing = await nftService.getListingById(id);

      if (listing) {
        res.status(200).json({
          success: true,
          data: listing,
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Listing not found",
        });
      }
    } catch (error) {
      console.error("Error fetching listing:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch listing",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export default new NFTController();
