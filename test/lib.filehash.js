var chai      = require('chai');
var expect    = chai.expect;
var sinon     = require('sinon');
var sinonChai = require('sinon-chai');
chai.use(sinonChai);

var FileHash = require('../lib/filehash').FileHash;

describe('lib/filehash', function(){

  describe('hash', function(){

    it('should produce 32 bytes of data\'s hash', function(){
      var hash = FileHash.hash('my_test_data');
      expect(hash).to.equal('a9ac07f0b4097240d2d33e832bd81ce6f417bdf29958db6e5f91c1631c68cfc9');
      expect(hash).to.have.length(64);
    });

  });

});
