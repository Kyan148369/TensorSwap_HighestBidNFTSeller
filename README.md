
# TensorSwap NFT Seller

A Node.js script for NFT selling on Tensor's Solana marketplace with configurable min price thresholds.

## Overview
This script automates the process of selling NFTs on Tensor by:
- Fetching user's NFT portfolio
- Finding the best available bids across collections
- Executing sales transactions when price thresholds are met
- Handling versioned and legacy Solana transactions respectively 

## Features
- Automatic best bid detection
- Configurable minimum price thresholds
- Support for both versioned and legacy Solana transactions
- Comprehensive error handling and transaction confirmation
- Transaction logging with Solscan links

## Prerequisites 
- Node.js v16 or higher
- npm or yarn
- A Solana wallet with NFTs
- Tensor API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Kyan148369/TensorSwap_HighestBidNFTSeller.git
```
2. Install dependencies:
```bash
npm install
```

## Configuration
1. Create a .env file in the project root with the following structure:


```bash
TENSOR_API_KEY=<ENTER API KEY HERE>
PRIVATE_KEY=<ENTER YOUR PRIVATE KEY HERE>
WALLET_ADDRESS=<ENTER YOUR WALLET ADDRESS HERE>
```
TENSOR_API_KEY: Your Tensor marketplace API key.   
PRIVATE_KEY: Your Solana wallet private key.   
WALLET_ADDRESS: Your Solana wallet corresponding public address

## Dependencies

@solana/web3.js: Solana blockchain interaction (v1.95.5)   
node-fetch: HTTP requests (v3.3.2).   
bs58: Base58 encoding/decoding (v6.0.0).  
dotenv: Environment variable management (v16.4.5).   

## Usage 
```bash
node tensor-seller.js [your-min-price]
```

## Example
If I wanted to sell my nft for a minimum of 1 sol I would run
```bash
node tensor-seller.js 1 
```
## Important Notes

-The script uses ES modules (type: "module" in package.json).   
-Requires Node.js version that supports ES modules.  
-Keep your .env file secure and never commit it to version control.  
-Always verify transactions before confirming.  

## Security Notes

-Never share or commit your private key.  
-Store sensitive information only in .env file.  
-Keep your .env file in .gitignore.  
-Review code and transactions before execution.  

## License
ISC