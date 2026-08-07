// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CornShirtMarketplace is AccessControl, ReentrancyGuard {
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");

    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 priceInSen;
        uint64 expiresAt;
        bool active;
    }

    IERC721 public immutable ticketContract;

    mapping(bytes32 => Listing) public listings;
    mapping(bytes32 => bool) public processedPayments;

    event ListingCreated(
        bytes32 indexed listingReference,
        address indexed seller,
        uint256 indexed tokenId,
        uint256 priceInSen,
        uint64 expiresAt
    );
    event ListingCancelled(
        bytes32 indexed listingReference,
        address indexed seller,
        uint256 indexed tokenId
    );
    event ListingExpired(
        bytes32 indexed listingReference,
        address indexed seller,
        uint256 indexed tokenId
    );
    event ListingSettled(
        bytes32 indexed listingReference,
        bytes32 indexed paymentReference,
        address indexed buyer,
        address seller,
        uint256 tokenId,
        uint256 priceInSen
    );

    constructor(address ticketAddress) {
        require(ticketAddress != address(0), "Invalid ticket contract");
        ticketContract = IERC721(ticketAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SETTLER_ROLE, msg.sender);
    }

    function createListing(
        bytes32 listingReference,
        uint256 tokenId,
        uint256 priceInSen,
        uint64 expiresAt
    ) external nonReentrant {
        require(listingReference != bytes32(0), "Invalid listing reference");
        require(!listings[listingReference].active, "Listing already active");
        require(listings[listingReference].seller == address(0), "Listing already used");
        require(priceInSen > 0, "Invalid price");
        require(expiresAt > block.timestamp, "Event has ended");
        require(ticketContract.ownerOf(tokenId) == msg.sender, "Not ticket owner");
        require(
            ticketContract.getApproved(tokenId) == address(this)
                || ticketContract.isApprovedForAll(msg.sender, address(this)),
            "Marketplace is not approved"
        );

        listings[listingReference] = Listing({
            seller: msg.sender,
            tokenId: tokenId,
            priceInSen: priceInSen,
            expiresAt: expiresAt,
            active: true
        });

        emit ListingCreated(
            listingReference,
            msg.sender,
            tokenId,
            priceInSen,
            expiresAt
        );
    }

    function cancelListing(bytes32 listingReference) external nonReentrant {
        Listing storage listing = listings[listingReference];
        require(listing.active, "Listing is not active");
        require(listing.seller == msg.sender, "Not listing seller");

        listing.active = false;
        emit ListingCancelled(
            listingReference,
            listing.seller,
            listing.tokenId
        );
    }

    function reclaimExpiredListing(
        bytes32 listingReference
    ) external nonReentrant {
        Listing storage listing = listings[listingReference];
        require(listing.active, "Listing is not active");
        require(block.timestamp >= listing.expiresAt, "Listing has not expired");

        listing.active = false;
        emit ListingExpired(
            listingReference,
            listing.seller,
            listing.tokenId
        );
    }

    function settlePaidListing(
        bytes32 listingReference,
        bytes32 paymentReference,
        address buyer
    ) external onlyRole(SETTLER_ROLE) nonReentrant {
        Listing storage listing = listings[listingReference];
        require(listing.active, "Listing is not active");
        require(block.timestamp < listing.expiresAt, "Event has ended");
        require(paymentReference != bytes32(0), "Invalid payment reference");
        require(!processedPayments[paymentReference], "Payment already processed");
        require(buyer != address(0), "Invalid buyer");
        require(buyer != listing.seller, "Seller cannot be buyer");

        processedPayments[paymentReference] = true;
        listing.active = false;
        ticketContract.safeTransferFrom(listing.seller, buyer, listing.tokenId);

        emit ListingSettled(
            listingReference,
            paymentReference,
            buyer,
            listing.seller,
            listing.tokenId,
            listing.priceInSen
        );
    }

}
