const driver = require('bigchaindb-driver');
const config = require('../config/config');
const keyGenerationUtils = require('../utils/keyGenerationUtils');

const BIGCHAINDB_URL = process.env.BIGCHAINDB_URL || config.bigchaindburl;

const connection = new driver.Connection(BIGCHAINDB_URL);

// Register a new product. Status will be unavailable
function registerProduct(keySeed, product) {
  const currentIdentity = keyGenerationUtils.generateKeypair(keySeed);
  return new Promise((resolve, reject) => {
    // Create asset object.
    const assetData = {
      type: 'buffalonetworkAssetsPrototype',
      item: product,
    };

    // Create metadata object.
    const metaData = {
      action: 'unavailable',
      date: new Date().toISOString(),
    };

    // CREATE transaction.
    const registerProductToNetwork = driver.Transaction.makeCreateTransaction(

      // Include the resource as asset data.
      assetData,
      // Include metadata to give information on the action.
      metaData,
      // Create an output.
      [driver.Transaction.makeOutput(
        driver.Transaction.makeEd25519Condition(currentIdentity.publicKey),
      )],
      // Include the public key
      currentIdentity.publicKey,
    );

    // We sign the transaction
    const signedTransaction = driver.Transaction.signTransaction(registerProductToNetwork, currentIdentity.privateKey);

    // Post the transaction to the network
    connection.postTransactionCommit(signedTransaction).then((postedTransaction) => {
      // Let the promise resolve the created transaction.
      resolve(postedTransaction);

      // Catch exceptions
    }).catch((err) => {
      reject(err);
    });
  });
}

async function giveProduct(keySeed, transactionId) {
  const currentIdentity = keyGenerationUtils.generateKeypair(keySeed);
  return new Promise(async (resolve, reject) => {
    // Construct metadata.
    const metaData = {
      action: 'available',
      seed: keySeed,
      date: new Date().toISOString(),
    };

    const initialTransactions = await connection.getTransaction(transactionId);
    console.log('tester-->', initialTransactions);

    // Construct the new transaction
    const transferTransaction = driver.Transaction.makeTransferTransaction(
      // The previous transaction to be chained upon.
      [{ tx: initialTransactions, output_index: 0 }],

      // The (output) condition to be fullfilled in the next transaction.
      [driver.Transaction.makeOutput(driver.Transaction.makeEd25519Condition(currentIdentity.publicKey))],

      // Metadata
      metaData,
    );

    // Sign the new transaction.
    const signedTransaction = driver.Transaction.signTransaction(transferTransaction, currentIdentity.privateKey);

    // Post the transaction.
    connection.postTransactionCommit(signedTransaction).then((successfullyPostedTransaction) => {
      // Return the posted transaction to the callback funcion.
      resolve(successfullyPostedTransaction);
    }).catch((error) => {
      // Throw error
      reject(error);
    });
  });
}

async function reserveProduct(transactionId) {
  return new Promise(async (resolve, reject) => {
    // Construct metadata.

    const initialTransactions = await connection.getTransaction(transactionId);
    console.log('tester-->', initialTransactions);
    const currentIdentity = keyGenerationUtils.generateKeypair(initialTransactions.metadata.seed);

    const metaData = {
      action: 'pending',
      seed: initialTransactions.metadata.seed,
      date: new Date().toISOString(),
    };


    // Construct the new transaction
    const transferTransaction = driver.Transaction.makeTransferTransaction(
      // The previous transaction to be chained upon.
      [{ tx: initialTransactions, output_index: 0 }],

      // The (output) condition to be fullfilled in the next transaction.
      [driver.Transaction.makeOutput(driver.Transaction.makeEd25519Condition(currentIdentity.publicKey))],

      // Metadata
      metaData,
    );

    // Sign the new transaction.
    const signedTransaction = driver.Transaction.signTransaction(transferTransaction, currentIdentity.privateKey);

    // Post the transaction.
    connection.postTransactionCommit(signedTransaction).then((successfullyPostedTransaction) => {
      // Return the posted transaction to the callback funcion.
      resolve(successfullyPostedTransaction);
    }).catch((error) => {
      // Throw error
      reject(error);
    });
  });
}

async function confirmProduct(newOwnerSeed, transactionId) {
  // const currentIdentity = keyGenerationUtils.generateKeypair(keySeed);
  const newIdentity = keyGenerationUtils.generateKeypair(newOwnerSeed);
  return new Promise(async (resolve, reject) => {
    // Construct metadata.
    const metaData = {
      action: 'unavailable',
      date: new Date().toISOString(),
    };

    const initialTransactions = await connection.getTransaction(transactionId);
    console.log('tester-->', initialTransactions);
    const currentIdentity = keyGenerationUtils.generateKeypair(initialTransactions.metadata.seed);


    // Construct the new transaction
    const transferTransaction = driver.Transaction.makeTransferTransaction(
      // The previous transaction to be chained upon.
      [{ tx: initialTransactions, output_index: 0 }],

      // The (output) condition to be fullfilled in the next transaction.
      [driver.Transaction.makeOutput(driver.Transaction.makeEd25519Condition(newIdentity.publicKey))],

      // Metadata
      metaData,
    );

    // Sign the new transaction.
    const signedTransaction = driver.Transaction.signTransaction(transferTransaction, currentIdentity.privateKey);

    // Post the transaction.
    connection.postTransactionCommit(signedTransaction).then((successfullyPostedTransaction) => {
      // Return the posted transaction to the callback funcion.
      resolve(successfullyPostedTransaction);
    }).catch((error) => {
      // Throw error
      reject(error);
    });
  });
}

async function getAllAssets() {
  const assets = await new Promise((resolve, reject) => {
    connection.searchAssets('buffalonetworkAssetsPrototype').then((response) => {
      resolve(response);
    }).catch((error) => {
      reject(error);
    });
  });
  return assets;
}

async function getAssetDetails(assetId) {
  return new Promise((resolve, reject) => {
    connection.listTransactions(assetId).then((response) => {
      resolve(response);
    }).catch((error) => {
      reject(error);
    });
  });
}

async function getAssetsByStatus(assets, status) {
  let availableAssets = []
  let promiseArray = []
  assets.forEach(async function (asset) {
    promiseArray.push(getAssetDetails(asset.id));
  });
  await Promise.all(promiseArray).then(function (assetDetails) {
    assetDetails.forEach(function (details) {
      const lastIndex = details[details.length - 1];
      if (lastIndex.metadata.action === status) {
        availableAssets.push(lastIndex)
      }
    });
  });
  return availableAssets;
}

async function getProductsFromCustomer(keySeed) {
  const currentIdentity = keyGenerationUtils.generateKeypair(keySeed);
  const transactionIds = await new Promise((resolve, reject) => {
    // Get a list of ids of unspent transactions from a public key.
    connection.listOutputs(currentIdentity.publicKey, false).then((response) => {
      resolve(response);
    }).catch((err) => {
      reject(err);
    });
  });

  const assets = [];

  for (const transaction of transactionIds) {
    await connection.getTransaction(transaction.transaction_id).then(async (response) => {
      if (response.operation === 'CREATE') {
        const assetTransactions = await connection.listTransactions(response.id, 'CREATE');
        return { id: assetTransactions[0].id, data: assetTransactions[0].asset.data };
      }
      const assetTransactions = await connection.listTransactions(response.asset.id, 'CREATE');
      return { id: assetTransactions[0].id, data: assetTransactions[0].asset.data };
    }).then((response) => {
      assets.push(response);
    }).catch((err) => {
      console.log(transaction.transaction_id);
    });
  }
  return assets;
}

module.exports = {
  registerProduct, giveProduct, reserveProduct, confirmProduct, getAllAssets, getAssetDetails, getProductsFromCustomer, getAssetsByStatus
};
