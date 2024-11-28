import 'dotenv/config'; // Load environment variables from a .env file
import fetch from 'node-fetch'; // Import the fetch API for making HTTP requests
import {
    Connection, // Import Connection class to interact with the Solana blockchain
    Keypair, // Import Keypair class for managing wallet keys
    Transaction, // Import Transaction class for creating transactions
    VersionedTransaction, // Import VersionedTransaction for handling versioned transactions
    sendAndConfirmTransaction,
} from '@solana/web3.js'; // Import Solana web3.js library
import bs58 from 'bs58'; // Import bs58 for base58 encoding/decoding

class TensorNFTSeller { // Define a class for selling NFTs
    constructor(apiKey) { // Constructor to initialize the class with an API key
        this.apiKey = apiKey; // Store the API key
        this.baseUrl = 'https://api.mainnet.tensordev.io/api/v1'; // Set the base URL for the Tensor API
        this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed'); // Create a connection to the Solana blockchain

        try {
            const privateKeyBytes = bs58.decode(process.env.PRIVATE_KEY); // Decode the private key from base58
            this.wallet = Keypair.fromSecretKey(privateKeyBytes); // Create a Keypair from the decoded private key
            console.log('Wallet Public Key:', this.wallet.publicKey.toString()); // Log the public key of the wallet
        } catch (error) {
            throw new Error(`Failed to create wallet: ${error.message}`); // Handle errors in wallet creation
        }
    }

    async fetchTensor(endpoint, method = 'GET', body = null) { // Method to fetch data from the Tensor API
        const url = `${this.baseUrl}${endpoint}`; // Construct the full URL for the API request
        const options = { // Set up the options for the fetch request
            method, // HTTP method (GET by default)
            headers: { // Set the request headers
                'accept': 'application/json', // Accept JSON response
                'x-tensor-api-key': this.apiKey // Include the API key in the headers
            }
        };

        if (body) { // If a body is provided for the request
            options.body = JSON.stringify(body); // Convert the body to JSON
            options.headers['Content-Type'] = 'application/json'; // Set the content type to JSON
        }

        // Log the API call details
        console.log(`Making ${method} request to ${url}`); // Log the request being made
        if (body) console.log('Request body:', body); // Log the request body if it exists

        const response = await fetch(url, options); // Make the fetch request

        if (!response.ok) { // Check if the response is not OK
            const text = await response.text(); // Get the response text
            throw new Error(`Tensor API error: ${response.status} ${text}`); // Throw an error with the response status and text
        }

        const jsonResponse = await response.json(); // Return the JSON response
        console.log('Response:', jsonResponse); // Log the response from the API
        return jsonResponse; // Return the JSON response
    }

    async sellNFT(minPriceSol = null) { // Method to sell an NFT with a minimum price in SOL
        try {
            const walletAddress = this.wallet.publicKey.toString(); // Get the wallet address as a string
            console.log(`Starting NFT sale process for wallet ${walletAddress}`); // Log the start of the sale process

            // 1. Get user's portfolio
            const portfolioUrl = `/user/portfolio?wallet=${walletAddress}&includeCompressed=true`; // Construct the URL to fetch the user's portfolio
            const portfolio = await this.fetchTensor(portfolioUrl); // Fetch the portfolio data

            if (!portfolio || portfolio.length === 0) { // Check if the portfolio is empty
                throw new Error('No collections found in portfolio'); // Throw an error if no collections are found
            }

            console.log('Collections found:', portfolio.map(c => ({ // Log the collections found in the portfolio
                name: c.name, // Get the name of the collection
                id: c.id, // Get the ID of the collection
                mint_count: c.mintCount // Get the mint count of the collection
            })));

            // 2. Get bids for each collection
            for (const collection of portfolio) { // Iterate over each collection in the portfolio
                const bidsUrl = `/collections/coll_bids?collId=${collection.id}&limit=5`; // Construct the URL to fetch bids for the collection
                const bidsResponse = await this.fetchTensor(bidsUrl); // Fetch the bids data

                if (!bidsResponse.bids || bidsResponse.bids.length === 0) { // Check if there are no bids
                    console.log(`No bids found for collection ${collection.name}`); // Log if no bids are found
                    continue; // Skip to the next collection
                }

                let bestBid = null; // Initialize bestBid to null
                let minPriceLamports; // Declare minPriceLamports in the function scope

                if (bidsResponse.bids.length > 0) {
                    minPriceLamports = minPriceSol !== null ? Math.floor(minPriceSol * 1e9) : 0; // Initialize with user input or 0

                    // 3. Find valid best bids
                    const validBids = bidsResponse.bids.filter(bid => { // Filter valid bids based on conditions
                        const bidAmount = parseInt(bid.amount); // Parse the bid amount
                        return bid.quantity > bid.filledQuantity && bidAmount >= minPriceLamports; // Check if the bid meets the criteria
                    });

                    if (validBids.length > 0) {
                        bestBid = validBids.sort((a, b) => parseInt(b.amount) - parseInt(a.amount))[0]; // Sort valid bids to find the best one and get the highest bid
                        if (minPriceSol === null) { // Only calculate 80% if the user input is not set
                            minPriceLamports = Math.floor(parseInt(bestBid.amount) * 0.8); // Convert the minimum price from SOL to lamports
                        }
                    } else if (minPriceSol !== null) { // If we set a min price but no bids were found above it, log and skip
                        console.log(`No valid bids found above minimum price of ${minPriceSol} for ${collection.name}`);
                        continue;
                    } else {
                        console.log(`No valid bids found for ${collection.name}`); // No bids found
                        continue;
                    }

                    if (bestBid) { // Log details if a best bid is found or user input is given
                        console.log('Best bid:', { // Log the best bid details
                            amount: (parseInt(bestBid.amount) / 1e9).toFixed(5) + ' SOL', // Convert the bid amount back to SOL
                            address: bestBid.address // Get the address of the bid
                        });
                        console.log(`minPriceLamports is ${minPriceLamports}`);
                    }
                } else { //Handle the case where no bids are found
                    minPriceLamports = minPriceSol !== null ? Math.floor(minPriceSol * 1e9) : 0;
                }





                // 5. Get latest blockhash
                const { blockhash } = await this.connection.getLatestBlockhash(); // Fetch the latest blockhash from the Solana blockchain

                //6. Get mint address of the nft
                const mintsResponse = await this.fetchTensor(`/user/inventory_by_collection?wallet=${walletAddress}&collId=${collection.id}&limit=${3}`)
                if(!mintsResponse || !mintsResponse.mints || !mintsResponse.mints[0] || !mintsResponse.mints[0].mint) {
                    console.log(`No mints found in collection: ${collection.name}. Skipping.`)
                    continue;
                }
                console.log(`This is ${mintsResponse.mints[0].mint}`)
                const params = new URLSearchParams({
                    seller: walletAddress,
                    mint: mintsResponse.mints[0].mint,
                    bidAddress: bestBid?.address || '', //Use optional chaining here
                    minPrice: minPriceLamports.toString(), //minPriceLamports is always defined now
                    blockhash: blockhash
                })
                // 7. Submit sell transaction
                const sellResponse = await this.fetchTensor(`/tx/sell?${params.toString()}`, 'GET');

                console.log('Sell response:', sellResponse); // Log the response from the sell transaction

                // 8. Process and sign transactions
                const txsToSign = sellResponse.txs.map((tx) =>
                    tx.txV0 ?
                        VersionedTransaction.deserialize(Buffer.from(tx.txV0, 'base64')) :
                        Transaction.from(Buffer.from(tx.tx, 'base64'))
                );

                // Log the transactions to be signed
                console.log('Transactions to sign:', txsToSign);

                // Sign Transactions
                txsToSign.forEach((tx) => {
                    if (tx instanceof VersionedTransaction) {
                        tx.sign([this.wallet]);
                    } else {
                        tx.sign(this.wallet);
                    }
                });

                // Log the connection object to check its type
                console.log('Connection object:', this.connection);

                // Send Transactions to Network
                for (const tx of txsToSign) {
                    console.log('Sending transaction:', tx); // Log the transaction being sent
                    const sig = await sendAndConfirmTransaction(this.connection, tx, this.wallet); // Use sendAndConfirmTransaction
                    console.log(`Transaction confirmed: https://solscan.io/tx/${sig}`);
                }

                return sellResponse; // Return the sell response after processing
            }

            throw new Error('No suitable bids found in any collection'); // Throw an error if no suitable bids are found

        } catch (error) {
            console.error('Error in sell process:', error); // Log any errors that occur during the sell process
            throw error; // Rethrow the error for further handling
        }
    }
}

async function main() { // Main function to execute the script
    if (!process.env.TENSOR_API_KEY) { // Check if the Tensor API key is not set
        throw new Error('TENSOR_API_KEY not found in environment variables'); // Throw an error if the API key is missing
    }

    const seller = new TensorNFTSeller(process.env.TENSOR_API_KEY); // Create an instance of TensorNFTSeller with the API key

    let minPriceSol = null;
    if (process.argv[2]) {
        minPriceSol = parseFloat(process.argv[2]);
        if (isNaN(minPriceSol) || minPriceSol <= 0) {
            throw new Error('Please provide a valid minimum price in SOL as a command-line argument (e.g., 0.001)');
        }
    }

    await seller.sellNFT(minPriceSol); // Call the sellNFT method with a minimum price of 0.001 SOL
}

main().catch(console.error); // Execute the main function and catch any errors