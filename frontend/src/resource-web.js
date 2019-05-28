const ftfApp = new Vue({
  el: '#rt-container',
  data: {
    resourceTracker: new resource_module.ResourceTracker(),
    activePane: 'identity',

    // Inputs
    identitySeedInput: 'buffalo-network',
    assetInput: {
      name: '',
      location: '',
      quantity: 0,
    },
    actionInput: '',
    otherFirmInput: '',
    activeTransaction: {
      asset: {
        data: {
          item: {
            name: '',
            location: '',
            quantity: 0,
          },
        },
      },
    },

    // Assets
    transactionIds: new Array(),
    assets: new Array(),
    transactionsForAsset: new Array(),
    allAssets: new Array(),

    // Flag
    myAssets: false,
  },
  methods: {
    setActive(pane) {
      this.activePane = pane;
    },
    isActive(pane) {
      return this.activePane === pane;
    },
    getAssets() {
      return this.assets;
    },

    // Forms
    identityButtonClicked() {
      this.resourceTracker.currentIdentity = this.resourceTracker.generateKeypair(this.identitySeedInput);
    },
    assetButtonClicked() {
      //if (this.assetInput === '') return;
      console.log('--->> -->> ', this.assetInput);
      this.resourceTracker.registerResource(this.assetInput).then((response) => {
        console.log('New asset added.');
        // Do nothing, just reload the asset list.
        ftfApp.loadAssetsIds();
      });
    },

    // Menu
    menuClicked(link) {
      switch (link) {
        case 'identity':
          this.activePane = 'identity';
          break;

        case 'assets':
          this.loadAssetsIds();
          this.activePane = 'assets';
          break;

        case 'all-assets':
          this.loadAllAssets();
          this.activePane = 'all-assets';
          break;
      }
    },

    // Loading assets
    loadAssetsIds() {
      this.resourceTracker.getResources().then((response) => {
        ftfApp.transactionIds = response;
        ftfApp.loadAssetsFromTransactionIds();
      });
    },
    loadAllAssets() {
      this.resourceTracker.getAllResources().then((response) => {
        ftfApp.allAssets = response;
      });
    },
    loadAssetsFromTransactionIds() {
      this.assets = new Array();

      for (const transaction of this.transactionIds) {
        this.resourceTracker.connection.getTransaction(transaction.transaction_id).then((response) => {
          if (response.operation === 'CREATE') return ftfApp.resourceTracker.connection.listTransactions(response.id, 'CREATE');
          return ftfApp.resourceTracker.connection.listTransactions(response.asset.id, 'CREATE');
        }).then((responseCreate) => {
          ftfApp.assets.push(responseCreate[0]);
        }).catch((err) => {
          console.log(transaction.transaction_id);
        });
      }
    },
    transactionClicked(id, myAssets) {
      this.myAssets = myAssets;
      this.resourceTracker.connection.getTransaction(id).then(response => ftfApp.activeTransaction = response);
      this.loadTransactionsForAsset(id);
      this.setActive('transactions');
    },
    loadTransactionsForAsset(assetId) {
      this.resourceTracker.connection.listTransactions(assetId).then(response => ftfApp.transactionsForAsset = response);
    },
    actionButtonClicked() {
      this.resourceTracker.connection.listTransactions(this.activeTransaction.id).then(response => ftfApp.resourceTracker.updateResource(response[response.length - 1], ftfApp.actionInput)).then((response) => {
        ftfApp.loadTransactionsForAsset(ftfApp.activeTransaction.id);
      });
    },
    otherFirmButtonClicked() {
      this.resourceTracker.connection.listTransactions(this.activeTransaction.id).then(response => this.resourceTracker.transferResource(response[response.length - 1], ftfApp.resourceTracker.generateKeypair(ftfApp.otherFirmInput).publicKey)).then((response) => {
        // Don't do anything with the response, go back to asset overview.
        ftfApp.menuClicked('assets');
      });
    },
  },
});
