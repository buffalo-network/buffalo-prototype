const driver = require('bigchaindb-driver');
const bip39 = require('bip39');

require('dotenv').config();

class ResourceTracker {
  constructor() {
    this.connection = new driver.Connection(process.env.APP_URL);
    this.currentIdentity = this.generateKeypair('buffalo-network');
  }

  /**
     * Generate a keypair based on the supplied seed string.
     * @param {string} keySeed - The seed that should be used to generate the keypair.
     * @returns {*} The generated keypair.
     */
  generateKeypair(keySeed) {
    if (typeof keySeed === 'undefined' || keySeed === '') return new driver.Ed25519Keypair();
    return new driver.Ed25519Keypair(bip39.mnemonicToSeedSync(keySeed).slice(0, 32));
  }

  registerResource(resource) {
    return new Promise((resolve, reject) => {
      // Create asset object.
      const assetData = {
        type: 'Buffalo-Network-Resource',
        item: resource,
      };

      // Create metadata object.
      const metaData = {
        action: 'Register',
        date: new Date().toISOString(),
      };

      // Create a CREATE transaction.
      const registerResourceToNetworkTransaction = driver.Transaction.makeCreateTransaction(

        // Include the resource as asset data.
        assetData,
        // Include metadata to give information on the action.
        metaData,
        // Create an output.
        [driver.Transaction.makeOutput(
          driver.Transaction.makeEd25519Condition(this.currentIdentity.publicKey),
        )],
        // Include the public key
        this.currentIdentity.publicKey,
      );

      // We sign the transaction
      const signedTransaction = driver.Transaction.signTransaction(registerResourceToNetworkTransaction, this.currentIdentity.privateKey);

      // Post the transaction to the network
      this.connection.postTransactionCommit(signedTransaction).then((postedTransaction) => {
        // Let the promise resolve the created transaction.
        resolve(postedTransaction);

        // Catch exceptions
      }).catch((err) => {
        reject(err);
      });
    });
  }

  /**
   * Get a list of ids of unspent transactions for a certain public key.
   * @returns {Array} An array containing all unspent transactions for a certain public key.
   */
  getResources() {
    return new Promise((resolve, reject) => {
      // Get a list of ids of unspent transactions from a public key.
      this.connection.listOutputs(this.currentIdentity.publicKey, false).then((response) => {
        resolve(response);
      });
    }).catch((err) => {
      reject(err);
    });
  }

  /**
   * Get a list of all resources that belong to our POC. (they contain the string 'Buffalo-Network-Resource)
   *
   * @returns {Array} The array of all resources that belong to our POC.
   */
  getAllResources() {
    return new Promise((resolve, reject) => {
      this.connection.searchAssets('buffalonetworkAssetsPrototype').then((response) => {
        resolve(response);
      });
    }).catch((error) => {
      reject(error);
    });
  }

  getAssetDetails(assetId) {
    return new Promise((resolve, reject) => {
      this.connection.listTransactions(assetId).then((response) => {
        resolve(response);
      }).catch((error) => {
        reject(error);
      });
    });
  }

  async getAllResourcesByStatus(assets, status) {
    let availableAssets = []
    let promiseArray = []
    assets.forEach(async function(asset) {
      promiseArray.push(this.getAssetDetails(asset.id));
    });
    await Promise.all(promiseArray).then(function(assetDetails) {
      assetDetails.forEach(function(details) {
        const lastIndex = details[details.length - 1];
        if (lastIndex.metadata.action === status) {
          availableAssets.push(lastIndex);
        }
      });
    });
    return availableAssets;
  }

  /**
   * Load a transaction by using its transaction id.
   * @param {*} transactionId
   */
  loadTransaction(transactionId) {
    return new Promise((resolve, reject) => {
      // Get the transaction by its ID.
      this.connection.getTransaction(transactionId).then((response) => {
        resolve(response);
      }).catch((err) => {
        reject(err);
      });
    });
  }

  /**
   * Update the resource by issuing a TRANSFER transaction with metadata containing the action performed on the asset.
   *
   * @param {*} transaction - The transaction that needs to be chained upon.
   * @param {*} action - The action performed on the resource (e.g. processed/reused).
   */
  updateResource(transaction, action) {
    return new Promise((resolve, reject) => {
      console.log(transaction);

      // Create metadata for action.
      const metaData = {
        action,
        date: new Date().toISOString(),
      };

      // Create a new TRANSFER transaction.
      const updateAssetTransaction = driver.Transaction.makeTransferTransaction(

        // previous transaction.
        [{ tx: transaction, output_index: 0 }],

        // Create new output.
        [driver.Transaction.makeOutput(driver.Transaction.makeEd25519Condition(this.currentIdentity.publicKey))],

        // Add metadata.
        metaData,
      );

      // Sign new transaction.
      const signedTransaction = driver.Transaction.signTransaction(updateAssetTransaction, this.currentIdentity.privateKey);

      console.log('Posting transaction.');
      // Post the new transaction.
      this.connection.postTransactionCommit(signedTransaction).then((postedTransaction) => {
        // Return the posted transaction to the callback function.
        resolve(postedTransaction);
      }).catch((err) => {
        reject(err);
      });
    });
  }

  /**
   * Transfer a resource to another owner by using their public key.
   *
   * @param {*} transaction - The transaction that needs to be chained upon.
   * @param {*} receiverPublicKey - The public key of the receiver.
   */
  transferResource(transaction, receiverPublicKey) {
    return new Promise((resolve, reject) => {
      // Construct metadata.
      const metaData = {
        action: 'Transfer resource to another owner.',
        date: new Date().toISOString(),
      };

      // Construct the new transaction
      const transferTransaction = driver.Transaction.makeTransferTransaction(

        // The previous transaction to be chained upon.
        [{ tx: transaction, output_index: 0 }],

        // The (output) condition to be fullfilled in the next transaction.
        [driver.Transaction.makeOutput(driver.Transaction.makeEd25519Condition(receiverPublicKey))],

        // Metadata
        metaData,
      );

      // Sign the new transaction.
      const signedTransaction = driver.Transaction.signTransaction(transferTransaction, this.currentIdentity.privateKey);

      // Post the transaction.
      this.connection.postTransactionCommit(signedTransaction).then((successfullyPostedTransaction) => {
        // Return the posted transaction to the callback funcion.
        resolve(successfullyPostedTransaction);
      }).catch((error) => {
        // Throw error
        reject(error);
      });
    });
  }
}

module.exports = { ResourceTracker };
