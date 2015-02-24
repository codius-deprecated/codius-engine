var chai      = require('chai');
var expect    = chai.expect;
var sinonChai = require('sinon-chai');
var Promise = require('bluebird').Promise;
chai.use(sinonChai);

var path      = require('path');
var Engine    = require(path.join(__dirname, '/../lib/engine')).Engine;
var Compiler  = require(path.join(__dirname, '/../lib/compiler')).Compiler;
var Config    = require(path.join(__dirname, '/../lib/config')).Config;
var FileManager = require(path.join(__dirname, '/../lib/filemanager')).FileManager;

var config    = new Config();
var engine    = new Engine(config);
var masterPublicKey;
  
describe('lib/engine', function() {
  describe('registerAPI', function(){
    it.skip('should register a new API module factory with the engine', function() {
    });
  });

  describe('setContractStorage', function(){
    it.skip('should take a function that will be connected to the LocalStorage API', function() {
    });
  });

  describe('runContract', function(){
    it('should run a contract', function() {
      var fileManager = new FileManager(config);
      var compiler = new Compiler(config);
      var currentDir = path.join(__dirname, '/test_contract');
      var p = [];
      compiler.on('file', function(event) {
        if (event.name.indexOf(currentDir) !== 0) {
          throw new Error('File path does not have current directory prefix: ' + event.name);
        }
        p.push(fileManager.storeFileWithHash(event.hash, event.data));
      });
      var manifestHash = compiler.compileModule(path.join(__dirname, '/test_contract'));
      Promise.all(p).then(function() {
        var runner = engine.runContract(manifestHash);
        expect(runner._manifest_hash).to.equal(manifestHash)
      });
      // TODO: more tests
    });
  });

  describe('generateSecrets', function(){
    it('should generate the host\'s secrets from the MASTER_SECRET', function() {
      var secrets = engine.generateSecrets(config.MASTER_SECRET)
      expect(secrets).to.have.keys(['CONTRACT_SECRET_GENERATOR', 'CONTRACT_KEYPAIR_GENERATOR_ec_secp256k1', 'MASTER_KEYPAIR_ec_secp256k1']);
      expect(secrets.MASTER_KEYPAIR_ec_secp256k1).to.have.keys(['private', 'public']);
      masterPublicKey = secrets.MASTER_KEYPAIR_ec_secp256k1.public
    });
  });

  describe('getMasterPublicKey', function(){
    it('should get the engine\'s master public key', function() {
      var publicKey = engine.getMasterPublicKey();
      expect(publicKey).to.equal(masterPublicKey);
    });
  });

});
