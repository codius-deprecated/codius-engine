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

  describe('sign', function(){

    it('should take a hex-encoded private key and a hex-encoded string as data', function(){
      var private_key = node_crypto.randomBytes(32).toString('hex');
      var data = '04a762c77d95e9c03506261cd548980645b42ee22b4a7fff25bf260387c5b5b1efbfb5f656c97c02f84388d4a46df01a69dc4390f746838d03f556020ae5462214';
      var signature = crypto.sign(private_key, data);
      expect(signature).to.match(HEX_REGEX);
    });

    it('should produce a signature that the verify method verifies correctly', function(){
      var private_key = '8dbf80d806b61d6283e8780c426139e6b1df05ef603189e3a58aadb5b4ac088f';
      var public_key = '04f55ef1f7daa6ca8c2629fca4b710d69472720666f18039d910d79c5b9eb7fa8c0ab4ca3d932647669c27fff33fd3199b93cb68f0811948f818ec347aeab2d34d';
      var data = '04a762c77d95e9c03506261cd548980645b42ee22b4a7fff25bf260387c5b5b1efbfb5f656c97c02f84388d4a46df01a69dc4390f746838d03f556020ae5462214';
      expect(crypto.verify(public_key, data, crypto.sign(private_key, data))).to.be.true;
    });

    // it('should produce a signature that matches an alternate implementation', function(){
    //    // TODO
    // });

  });

});
