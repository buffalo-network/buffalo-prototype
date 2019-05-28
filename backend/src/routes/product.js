const resourceService = require('../services/resourceService');
const keyGeneration = require('../utils/keyGenerationUtils');

module.exports = [

// All assets to change products
  {
    // Input: seed and product
    // Output: product with status available
    method: 'POST',
    path: '/api/product/give',
    config: { auth: false, cors: true },
    async handler(req, h) {
      const registerTransaction = await resourceService.registerProduct(req.payload.seed, req.payload.product);
      const giveTransaction = await resourceService.giveProduct(req.payload.seed, registerTransaction.id);
      return giveTransaction.id
  }
  },
  {
    // Input: seed and productId
    // Output: product with status available
    method: 'POST',
    path: '/api/product/return',
    config: { auth: false, cors: true },
    async handler(req, h) {
      const giveTransaction = await resourceService.giveProduct(req.payload.seed, req.payload.transactionId);
      return giveTransaction.id
    }
  },
  {
    // Input seed of owner and transactionID
    // Output product is now pending
    method: 'POST',
    path: '/api/product/pending',
    config: { auth: false, cors: true },
    async handler(req, h) {
      const takeTransaction = await resourceService.reserveProduct(req.payload.transactionId);
      return takeTransaction.id
    }
  },
  {
    // Input seed of owner and transactionID
    // Output product is now unavailabe and ownership is changed
    method: 'POST',
    path: '/api/product/confirm',
    config: { auth: false, cors: true },
    async handler(req, h) {
      const takeTransaction = await resourceService.confirmProduct(req.payload.newOwner, req.payload.transactionId);
      return takeTransaction.id
    }
  },

// All routes for user products

  {
    method: 'GET',
    path: '/api/products/{seed}',
    config: { auth: false, cors: true },
    async handler(req, h) {
      const status = req.params.status;
      const seed = req.params.seed;

      let userAssets = {};

      const assets = await resourceService.getProductsFromCustomer(seed);
      userAssets.unavailable = await resourceService.getAssetsByStatus(assets, 'unavailable');
      userAssets.available = await resourceService.getAssetsByStatus(assets, 'available');
      userAssets.pending = await resourceService.getAssetsByStatus(assets, 'pending');

      return userAssets;
    },
  },

// All routes for general platform

  {
    // Get all assets that are tagged available
    method: 'GET',
    path: '/api/products/available',
    config: { auth: false, cors: true },
    async handler(req, h) {
      const assets = await resourceService.getAllAssets();
      const availableAssets = await resourceService.getAssetsByStatus(assets, 'available');
      return availableAssets;
    },
  },
  {
    // Get keypair for seed
    method: 'GET',
    path: '/api/user/{seed}',
    config: { auth: false, cors: true },
    async handler(req, h) {
      const assets = await keyGeneration.generateKeypair(req.params.seed);
      return assets;
    },
  },
  ];
