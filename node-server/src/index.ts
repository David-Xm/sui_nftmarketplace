import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import nftRoutes from "./routes/nft.routes";

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((_req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${_req.method} ${_req.path}`);
  next();
});

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use("/api", nftRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 NFT Marketplace API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /api/listings - Get all NFT listings`);
  console.log(`   GET  /api/listings/:id - Get specific listing`);
  console.log(`   POST /api/mint - Mint a new NFT`);
  console.log(`   POST /api/buy - Buy an NFT`);
  console.log(`\n🔗 SUI Blockchain endpoints:`);
  console.log(`   GET  /api/sui/config - Check SUI configuration`);
  console.log(`   GET  /api/sui/transaction/:digest - Get transaction details`);
  console.log(`   GET  /api/sui/events/:eventType - Query blockchain events`);
  console.log(`   GET  /api/sui/nft/:nftId - Get NFT from blockchain`);
});

export default app;
