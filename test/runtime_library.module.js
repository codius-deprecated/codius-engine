var chai      = require('chai');
var expect    = chai.expect;
var sinon     = require('sinon');
var sinonChai = require('sinon-chai');
chai.use(sinonChai);

var vm = require('vm');
var fs = require('fs');
var module_code = fs.readFileSync(__dirname + '/../runtime_library/module.js', { encoding: 'utf8' });

function getNewModuleVersion(context){
  vm.runInNewContext(module_code, context);
  return context;
}

describe('Runtime Library module', function(){

  describe('require', function(){

    it('should throw an error if no callback is supplied', function(){

      var context = {};
      var module = getNewModuleVersion(context);

      expect(module.require.bind(module, 'module_id')).to.throw(/require is asynchronous. Must provide a callback/);

    });

    it('should respond with an error if the identifier is neither a module, nor a javascript or JSON file', function(done){
      var postMessage = sinon.stub();
      postMessage.callsArgWith(1, null, '{"test":[1,2],"a":"b","c":{"d":-1}}');
      var context = {
        postMessage: postMessage
      };
      var module = getNewModuleVersion(context);

      module.require('./test.txt', function(error, result){
        expect(error).to.exist;
        expect(result).not.to.exist;
        done();
      });
    });

    it('should call postMessage with a stringified parameters object', function(done){

      var postMessage = sinon.stub();
      postMessage.callsArg(1);
      var context = {
        postMessage: postMessage
      };
      var module = getNewModuleVersion(context);

      module.require('module_id', function(error, result){
        expect(postMessage).to.have.been.calledWith({
          api: 'fs',
          method: 'readFile',
          data: JSON.stringify({
            path: 'module_id',
            options: {
              encoding: 'utf8'
            }
          })
        });
        done();
      });
    });

    it('should eval and extract the module.exports from javascript files', function(done){

      var postMessage = sinon.stub();
      postMessage.callsArgWith(1, null, 'module.exports={ global_data: "Hello World!" }');
      var context = {
        postMessage: postMessage
      };
      var module = getNewModuleVersion(context);

      module.require('module_id', function(error, result){
        expect(error).not.to.exist;
        expect(result).to.have.property('global_data', 'Hello World!');
        done();
      });

    });

    it('should parse json files', function(done){
      var postMessage = sinon.stub();
      postMessage.callsArgWith(1, null, '{"test":[1,2],"a":"b","c":{"d":-1}}');
      var context = {
        postMessage: postMessage
      };
      var module = getNewModuleVersion(context);

      module.require('test.json', function(error, result){
        expect(error).not.to.exist;
        expect(result).to.deep.equal({
          test: [1, 2],
          a: 'b',
          c: { d: -1 }
        });
        done();
      });
    });

    // it('should expose a modified version of itself to submodules that translates relative paths to full paths', function(done){
    //
    //   var postMessage = sinon.stub();
    //   postMessage.onFirstCall.callsArgWith(1, null, 'module.exports=(function(){  })');
    //   postMessage.onSecondCall.callsArgWith(1, null, 'module.exports={ global_data: "Hello World!" }');
    //   var context = {
    //     postMessage: postMessage
    //   };
    //   var module = getNewModuleVersion(context);
    //
    //   module.require('module_id', function(error, result){
    //     expect(error).not.to.exist;
    //     expect(result).to.have.property('global_data', 'Hello World!');
    //     done();
    //   });
    //
    // });
    //
    // it('should overwrite itself when javascript files are being evaluated to translate relative paths to full paths', function(done){
    //
    // });

  });

});
