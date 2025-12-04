/*
/// Module: nft_marketplace
module nft_marketplace::nft_marketplace;
*/

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions

module contract::nft_marketplace;

use std::string::{Self, String};
use sui::event;
use sui::url::{Self, Url};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::package;
use sui::display;
use sui::table::{Self, Table};

// ===== Errors =====

const ENotOwner: u64 = 1;
const EInsufficientPayment: u64 = 2;
const ENotListed: u64 = 3;
const EInvalidPrice: u64 = 4;

// ===== Structs =====

/// The NFT struct representing a unique digital asset
public struct NFT has key, store {
    id: UID,
    name: String,
    description: String,
    url: Url,
    creator: address,
    owner: address,
}

/// Marketplace Registry - shared object to track stats
public struct NftMarketplaceRegistry has key {
    id: UID,
    total_nfts_minted: u64,
    total_nfts_listed: u64,
    total_sales: u64,
    total_volume: u64,
    // Table to track active listings: NFT ID -> Listing
    listings: Table<ID, Listing>,
}

/// Listing information for an NFT
public struct Listing has store, drop, copy {
    nft_id: ID,
    seller: address,
    price: u64,
    listed: bool,
}

// ===== Events =====

public struct NFTMinted has copy, drop {
    nft_id: ID,
    creator: address,
    owner: address,
    name: String,
    url: String,
}

public struct NFTListed has copy, drop {
    nft_id: ID,
    seller: address,
    price: u64,
}

public struct NFTDelisted has copy, drop {
    nft_id: ID,
    seller: address,
}

public struct NFTSold has copy, drop {
    nft_id: ID,
    seller: address,
    buyer: address,
    price: u64,
}

public struct OwnerUpdated has copy, drop {
    nft_id: ID,
    old_owner: address,
    new_owner: address,
}

// ===== One-Time Witness for Display =====

public struct NFTMARKETPLACE has drop {}

// ===== Initialization =====

fun init(otw: NFTMARKETPLACE, ctx: &mut TxContext) {
    let keys = vector[
        b"name".to_string(),
        b"description".to_string(),
        b"image_url".to_string(),
        b"creator".to_string(),
        b"project_url".to_string(),
    ];

    let values = vector[
        b"{name}".to_string(),
        b"{description}".to_string(),
        b"{url}".to_string(),
        b"{creator}".to_string(),
        b"https://github.com/sui-nft-marketplace".to_string(),
    ];

    let publisher = package::claim(otw, ctx);
    let mut display = display::new_with_fields<NFT>(&publisher, keys, values, ctx);
    display.update_version();

    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(display, ctx.sender());

    // Create and share the nftmarketplace registry
    let registry = NftMarketplaceRegistry {
        id: object::new(ctx),
        total_nfts_minted: 0,
        total_nfts_listed: 0,
        total_sales: 0,
        total_volume: 0,
        listings: table::new(ctx),
    };
    transfer::share_object(registry);
}

// ===== Public Entry Functions =====

/// Mint a new NFT to the sender
public entry fun mint_nft(
    registry: &mut NftMarketplaceRegistry,
    name: vector<u8>,
    description: vector<u8>,
    url: vector<u8>,
    ctx: &mut TxContext,
) {
    let sender = ctx.sender();
    let nft_name = string::utf8(name);
    let nft_url = url::new_unsafe_from_bytes(url);

    let nft = NFT {
        id: object::new(ctx),
        name: nft_name,
        description: string::utf8(description),
        url: nft_url,
        creator: sender,
        owner: sender,
    };

    let nft_id = object::id(&nft);

    // Update registry stats
    registry.total_nfts_minted = registry.total_nfts_minted + 1;

    // Emit minting event
    event::emit(NFTMinted {
        nft_id,
        creator: sender,
        owner: sender,
        name: nft.name,
        url: nft_url.inner_url().to_string(),
    });

    transfer::public_transfer(nft, sender);
}

/// List an NFT for sale
public entry fun list_nft(
    registry: &mut NftMarketplaceRegistry,
    nft: NFT,
    price: u64,
    ctx: &mut TxContext,
) {
    let sender = ctx.sender();

    // Validate price
    assert!(price > 0, EInvalidPrice);

    // Verify sender is the owner
    assert!(nft.owner == sender, ENotOwner);

    let nft_id = object::id(&nft);

    // Create listing
    let listing = Listing {
        nft_id,
        seller: sender,
        price,
        listed: true,
    };

    // Store listing in registry
    table::add(&mut registry.listings, nft_id, listing);

    // Update registry stats
    registry.total_nfts_listed = registry.total_nfts_listed + 1;

    // Emit listing event
    event::emit(NFTListed {
        nft_id,
        seller: sender,
        price,
    });

    // Transfer NFT to registry (marketplace holds it)
    transfer::public_transfer(nft, @nft_marketplace);
}

/// Delist an NFT from sale
public entry fun delist_nft(
    registry: &mut NftMarketplaceRegistry,
    nft: NFT,
    ctx: &mut TxContext,
) {
    let sender = ctx.sender();
    let nft_id = object::id(&nft);

    // Verify listing exists
    assert!(table::contains(&registry.listings, nft_id), ENotListed);

    // Get and remove listing
    let listing = table::remove(&mut registry.listings, nft_id);

    // Verify sender is the seller
    assert!(listing.seller == sender, ENotOwner);

    // Update registry stats
    registry.total_nfts_listed = registry.total_nfts_listed - 1;

    // Emit delisting event
    event::emit(NFTDelisted {
        nft_id,
        seller: sender,
    });

    // Return NFT to seller
    transfer::public_transfer(nft, sender);
}

/// Buy a listed NFT
public entry fun buy_nft(
    registry: &mut NftMarketplaceRegistry,
    nft: NFT,
    payment: Coin<SUI>,
    ctx: &mut TxContext,
) {
    let buyer = ctx.sender();
    let nft_id = object::id(&nft);

    // Verify listing exists
    assert!(table::contains(&registry.listings, nft_id), ENotListed);

    // Get and remove listing
    let listing = table::remove(&mut registry.listings, nft_id);
    let seller = listing.seller;
    let price = listing.price;

    // Verify payment amount
    assert!(coin::value(&payment) >= price, EInsufficientPayment);

    // Update NFT owner
    let old_owner = nft.owner;
    let mut owned_nft = nft;
    owned_nft.owner = buyer;

    // Update registry stats
    registry.total_sales = registry.total_sales + 1;
    registry.total_volume = registry.total_volume + price;
    registry.total_nfts_listed = registry.total_nfts_listed - 1;

    // Emit sale event
    event::emit(NFTSold {
        nft_id,
        seller,
        buyer,
        price,
    });

    // Emit owner updated event
    event::emit(OwnerUpdated {
        nft_id,
        old_owner,
        new_owner: buyer,
    });

    // Transfer payment to seller
    transfer::public_transfer(payment, seller);

    // Transfer NFT to buyer
    transfer::public_transfer(owned_nft, buyer);
}

/// Update NFT owner (transfer)
public entry fun update_owner(
    nft: NFT,
    new_owner: address,
    ctx: &mut TxContext,
) {
    let sender = ctx.sender();

    // Verify sender is current owner
    assert!(nft.owner == sender, ENotOwner);

    let nft_id = object::id(&nft);
    let old_owner = nft.owner;

    // Update owner
    let mut owned_nft = nft;
    owned_nft.owner = new_owner;

    // Emit owner updated event
    event::emit(OwnerUpdated {
        nft_id,
        old_owner,
        new_owner,
    });

    // Transfer to new owner
    transfer::public_transfer(owned_nft, new_owner);
}

// ===== View Functions =====

/// Get NFT name
public fun name(nft: &NFT): &String {
    &nft.name
}

/// Get NFT description
public fun description(nft: &NFT): &String {
    &nft.description
}

/// Get NFT URL
public fun url(nft: &NFT): &Url {
    &nft.url
}

/// Get NFT creator
public fun creator(nft: &NFT): address {
    nft.creator
}

/// Get NFT owner
public fun owner(nft: &NFT): address {
    nft.owner
}

/// Get total NFTs minted
public fun total_nfts_minted(registry: &NftMarketplaceRegistry): u64 {
    registry.total_nfts_minted
}

/// Get total NFTs listed
public fun total_nfts_listed(registry: &NftMarketplaceRegistry): u64 {
    registry.total_nfts_listed
}

/// Get total sales
public fun total_sales(registry: &NftMarketplaceRegistry): u64 {
    registry.total_sales
}

/// Get total volume
public fun total_volume(registry: &NftMarketplaceRegistry): u64 {
    registry.total_volume
}

// ===== Test Functions =====

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    let registry = NftMarketplaceRegistry {
        id: object::new(ctx),
        total_nfts_minted: 0,
        total_nfts_listed: 0,
        total_sales: 0,
        total_volume: 0,
        listings: table::new(ctx),
    };
    transfer::share_object(registry);
}
