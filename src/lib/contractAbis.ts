// Human-readable ABI arrays for ethers v6

export const MUSDT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function faucet(uint256 amount)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const;

export const PROPERTY_TOKEN_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
  "function tokenTotalSupply(uint256 tokenId) view returns (uint256)",
  "function maxSupply(uint256 tokenId) view returns (uint256)",
  "function tokenPrice(uint256 tokenId) view returns (uint256)",
  "function propertyRegistered(uint256 tokenId) view returns (bool)",
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
  "event ApprovalForAll(address indexed account, address indexed operator, bool approved)",
] as const;

export const MARKETPLACE_ABI = [
  "function buy(uint256 tokenId, uint256 amount)",
  "function list(uint256 tokenId, uint256 amount, uint256 pricePerToken) returns (uint256 listingId)",
  "function buyFromListing(uint256 listingId)",
  "function cancelListing(uint256 listingId)",
  "function configurePrimary(uint256 tokenId, uint256 pricePerToken, uint256 supply)",
  "function withdrawPrimarySales(address to, uint256 amount)",
  "function primaryListings(uint256 tokenId) view returns (uint256 pricePerToken, uint256 remainingSupply, bool active)",
  "function secondaryListings(uint256 listingId) view returns (address seller, uint256 tokenId, uint256 amount, uint256 pricePerToken, bool active)",
  "function nextListingId() view returns (uint256)",
  "function primarySalesBalance() view returns (uint256)",
  "event PrimaryConfigured(uint256 indexed tokenId, uint256 pricePerToken, uint256 supply)",
  "event TokensPurchased(address indexed buyer, uint256 indexed tokenId, uint256 amount, uint256 totalCost)",
  "event ListingCreated(uint256 indexed listingId, address indexed seller, uint256 indexed tokenId, uint256 amount, uint256 pricePerToken)",
  "event ListingFilled(uint256 indexed listingId, address indexed buyer, uint256 totalCost)",
  "event ListingCancelled(uint256 indexed listingId)",
] as const;

export const DIVIDEND_VAULT_ABI = [
  "function deposit(uint256 tokenId, uint256 amount)",
  "function claim(uint256 tokenId)",
  "function claimable(uint256 tokenId, address user) view returns (uint256)",
  "function rewardPerTokenStored(uint256 tokenId) view returns (uint256)",
  "event DividendDeposited(uint256 indexed tokenId, uint256 amount, uint256 newRewardPerToken)",
  "event DividendClaimed(uint256 indexed tokenId, address indexed user, uint256 amount)",
] as const;
