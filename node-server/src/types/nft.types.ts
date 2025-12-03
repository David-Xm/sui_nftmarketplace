export interface NFTListing {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  price: string;
  seller: string;
  owner: string;
  isListed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MintRequest {
  name: string;
  description: string;
  image: string;
  recipient: string;
}

export interface MintResponse {
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  message?: string;
}

export interface BuyRequest {
  listingId: string;
  buyer: string;
}

export interface BuyResponse {
  success: boolean;
  transactionHash?: string;
  message?: string;
}

export interface ListingsQuery {
  page?: number;
  limit?: number;
  seller?: string;
  minPrice?: string;
  maxPrice?: string;
}
