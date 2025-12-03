import { Router } from "express";
import nftController from "../controllers/nft.controller";

const router = Router();

/**
 * @route   GET /api/listings
 * @desc    Get all NFT listings
 * @query   page, limit, seller, minPrice, maxPrice
 */
router.get("/listings", nftController.getListings.bind(nftController));

/**
 * @route   GET /api/listings/:id
 * @desc    Get a specific listing by ID
 * @param   id - Listing ID
 */
router.get("/listings/:id", nftController.getListingById.bind(nftController));

/**
 * @route   POST /api/mint
 * @desc    Mint a new NFT
 * @body    { name, description, image, recipient }
 */
router.post("/mint", nftController.mintNFT.bind(nftController));

/**
 * @route   POST /api/buy
 * @desc    Buy an NFT
 * @body    { listingId, buyer }
 */
router.post("/buy", nftController.buyNFT.bind(nftController));

// /**
//  * SUI Blockchain specific endpoints
//  */

// /**
//  * @route   GET /api/sui/transaction/:digest
//  * @desc    Get transaction details from SUI blockchain
//  * @param   digest - Transaction digest
//  */
// router.get(
//   "/sui/transaction/:digest",
//   suiController.getTransaction.bind(suiController)
// );

// /**
//  * @route   GET /api/sui/events/:eventType
//  * @desc    Query events from SUI blockchain
//  * @param   eventType - Event type to query
//  */
// router.get(
//   "/sui/events/:eventType",
//   suiController.getEvents.bind(suiController)
// );

// /**
//  * @route   GET /api/sui/nft/:nftId
//  * @desc    Get NFT details from SUI blockchain
//  * @param   nftId - NFT object ID
//  */
// router.get("/sui/nft/:nftId", suiController.getNFT.bind(suiController));

// /**
//  * @route   GET /api/sui/config
//  * @desc    Get SUI blockchain configuration status
//  */
// router.get("/sui/config", suiController.getConfig.bind(suiController));

export default router;
