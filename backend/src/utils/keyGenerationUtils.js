const driver = require('bigchaindb-driver');
const bip39 = require('bip39');

function generateKeypair(keySeed) {
  if (typeof keySeed === 'undefined' || keySeed === '') return new driver.Ed25519Keypair();
  return new driver.Ed25519Keypair(bip39.mnemonicToSeedSync(keySeed).slice(0, 32));
}

module.exports = { generateKeypair };
