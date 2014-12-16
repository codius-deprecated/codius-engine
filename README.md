# Contracts Engine
The engine to run contracts

## Playing with the engine

+ `npm install`
+ `npm test` runs the existing tests
+ Use the [`codius-cli`](https://github.com/codius/codius-cli) to run test contracts

## Structure of the engine

The engine is the part of Codius responsible for running sandboxed code and providing APIs for that code to communicate with.

For the sandbox we are currently using [`codius/node-sandbox`](https://github.com/codius/node-sandbox), which utilizes Native Client.

The [`Engine`](lib/engine.js) is the main component used to run contract code and the [`ContractRunner`](lib/contractrunner.js) is responsible for handling messages coming from the sandbox and passing valid ones to the corresponding APIs.

Contract code uses the `postMessage` command to communicate with the outside. The format is defined below. Most contracts will not use the `postMessage` command directly but will instead use modules or [`runtime_library`](runtime_library/) components, which are loaded into the sandbox by default.

## Questions?

Any questions? Join the live chat! [![Gitter chat](https://badges.gitter.im/codius/codius-chat.png)](https://gitter.im/codius/codius-chat)

## APIs and Message Formats

### IPC Messaging Format

#### Contract -> Sandbox

API call with callback
```js
{
  "type": "api",
  "api": "http",
  "method": "get",
  "data": "http://some.url",
  "callback": 4
}
```

#### Sandbox -> Contract

API callback
```js
{
  "type": "callback",
  "callback": 4,
  "error": null,
  "result": "some stringified result"
}
```

### Contract-specific Secrets and Keypairs

#### Secret Derivation

The engine must be started with a `MASTER_SECRET`.

This secret is used to derive multiple other secrets, which are used to provide contracts with unique private values and public/private key pairs. Derived secrets are the HMAC of the "parent" secret and the name of the "child" secret

+ `CONTRACT_SECRET_GENERATOR` - used to generate 512-bit private values
+ `CONTRACT_KEYPAIR_GENERATOR_ec_secp256k1` - used to generate `secp256k1` key pairs (e.g. `CONTRACT_KEYPAIR_13550350a8681c84c861aac2e5b440161c2b33a3e4f302ac680ca5b686de48de`)
+ other `CONTRACT_KEYPAIR_GENERATOR_{other signature schemes}` (e.g. `ec_ed25519`)
+ `MASTER_KEYPAIR_ec_secp256k1` - used to sign contracts' public keys
+ other `MASTER_KEYPAIR_{other signature schemes}` (e.g. `ec_ed25519`)


#### API

```js
var secrets = require('secrets');

// Get a secret that is deterministically generated and unique for the contract
secrets.getSecret(function(error, secret){
  // error: null
  // secret: "c88097bb32531bd14fc0c4e8afbdb8aa22d4d6eefcbe980d8c52bd6381c6c60ca746b330ce93decf5061a011ed71afde8b4ed4fbbf1531d010788e8bb79c8b6d"
});

// Get a secp256k1 key pair and the engine's signature on the public key
// Note that the signature is in DER format
secrets.getKeypair('ec_secp256k1', function(error, keypair){
  // error: null
  // keypair: {
  //   public: '0417b9f5b3ba8d550f19fdfb5233818cd27d19aaea029b667f547f5918c307ed3b1ee32e285f9152d61c2a85b275f1b27d955c2b59a313900c4006377afa538370',
  //   private: '9e623166ac44d4e75fa842f3443485b9c8380551132a8ffaa898b5c93bb18b7d',
  //   signature: '304402206f1c9e05bc2ad120e0bb58ff368035359d40597ef034509a7dc66a79d4648bea022015b417401d194cf2917e853a7565cfbce32ee90c5c8f34f54075ee2f87519d88'
  // }
});
