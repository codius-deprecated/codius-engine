var chai      = require('chai');
var expect    = chai.expect;
var sinonChai = require('sinon-chai');
chai.use(sinonChai);

var path      = require('path');
var Compiler  = require(path.join(__dirname, '/../lib/compiler')).Compiler;
var Config    = require(path.join(__dirname, '/../lib/config')).Config;

var config = new Config();
var compiler = new Compiler(config);
  
describe('lib/compiler', function() {

  describe('getRandomMasterSecret', function(){
    it('should compile a module into a manifest', function() {
      var manifestHash = compiler.compileModule(path.join(__dirname, '/test_contract'))
      expect(manifestHash).to.equal('f508c775790c378b6db6f1884817783e0e3a9ff64c2aa52d13737dca7eff7131');
    });
  });

  describe('setFilesystem', function(){
    it.skip('should accept a custom filesystem', function(done) {
      var fakeFilesystem = {
        // TODO: Redefine readFile, stat, readdir & exists
      }
      compiler.setFilesystem(fakeFilesystem);
      var manifestHash = compiler.compileModule(path.join(__dirname, '/test_contract'))
      expect(manifestHash).to.equal('f508c775790c378b6db6f1884817783e0e3a9ff64c2aa52d13737dca7eff7131');
    });
  });

});
