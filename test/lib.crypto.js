var chai      = require('chai');
var expect    = chai.expect;
var sinon     = require('sinon');
var sinonChai = require('sinon-chai');
chai.use(sinonChai);

var crypto = require('../lib/crypto');
var node_crypto = require('crypto');
var ecurve = require('ecurve');

var HEX_REGEX = /^[0-9a-fA-F]+$/;

describe('lib/crypto', function(){

  describe('deriveSecret', function(){

    it('should accept the parent_secret as a buffer', function(){
      var secret = crypto.deriveSecret(node_crypto.randomBytes(32), '');
      expect(HEX_REGEX.test(secret)).to.be.true;
    });

    it('should accept the parent_secret as a hex string', function(){
      var secret = crypto.deriveSecret(node_crypto.randomBytes(32).toString('hex'), '');
      expect(HEX_REGEX.test(secret)).to.be.true;
    });

    it('should produce 256-bit secrets if sha256 is used', function(){
      var secret = crypto.deriveSecret(node_crypto.randomBytes(32), '', 'sha256');
      expect(HEX_REGEX.test(secret)).to.be.true;
      expect(secret).to.have.length(64);
    });

    it('should produce 512-bit secrets if sha512 is used', function(){
      var secret = crypto.deriveSecret(node_crypto.randomBytes(32), '', 'sha512');
      expect(HEX_REGEX.test(secret)).to.be.true;
      expect(secret).to.have.length(128);
    });

    it('should default to using sha512', function(){
      var secret = crypto.deriveSecret(node_crypto.randomBytes(32), '');
      expect(HEX_REGEX.test(secret)).to.be.true;
      expect(secret).to.have.length(128);
    });

  });

  describe('deriveKeypair', function(){

    it('should return an object with "private" and "public fields"', function(){
      var keypair = crypto.deriveKeypair(node_crypto.randomBytes(32), '');
      expect(keypair).to.have.keys(['private', 'public']);
    });

    // it('should default to secp256k1 if no signature scheme is specified', function(){
    //    // TODO
    // });

    it('should throw an error if the signature scheme specified is not supported', function(){
      expect(function(){ crypto.deriveKeypair(node_crypto.randomBytes(32), '', 'ed25519'); }).to.throw(/Signature scheme: \w+ not currently supported/);
    });

    it('(secp256k1) should generate a valid secp256k1 keypair', function(){
      var keypair = crypto.deriveKeypair(node_crypto.randomBytes(32), node_crypto.randomBytes(32));
      var curve = ecurve.getCurveByName('secp256k1');
      expect(curve.validate(ecurve.Point.decodeFrom(curve, new Buffer(keypair.public, 'hex')))).to.be.true;
    });

    // it('(secp256k1) should generate a keypair that matches an alternate implementation', function(){
    //    // TODO
    // });

  });

});
