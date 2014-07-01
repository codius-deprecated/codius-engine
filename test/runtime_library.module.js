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

    it('should respond with an error if the identifier is neither a module, nor a javascript or JSON file', function(){
      var __readFileSync = sinon.stub();
      __readFileSync.returns('{"test":[1,2],"a":"b","c":{"d":-1}}');
      var context = {
        __readFileSync: __readFileSync
      };
      var module = getNewModuleVersion(context);

      expect(function(){ module.require('./test.txt'); }).to.throw(/require can only be used to load modules, javascript files, and JSON files/);
    });

    it('should call __readFileSync with the path', function(){

      var __readFileSync = sinon.spy();
      var context = {
        __readFileSync: __readFileSync
      };
      var module = getNewModuleVersion(context);

      var test_module = module.require('module_id');
      expect(__readFileSync).to.have.been.calledOnce;
    });

    it('should eval and extract the module.exports from javascript files', function(){

      var __readFileSync = sinon.stub();
      __readFileSync.returns('module.exports={ global_data: "Hello World!" }');
      var context = {
        __readFileSync: __readFileSync
      };
      var module = getNewModuleVersion(context);

      var test_module = module.require('module_id');
      expect(test_module).to.have.property('global_data', 'Hello World!');
    });

    it('should parse json files', function(){
      var __readFileSync = sinon.stub();
      __readFileSync.returns('{"test":[1,2],"a":"b","c":{"d":-1}}');
      var context = {
        __readFileSync: __readFileSync
      };
      var module = getNewModuleVersion(context);

      var test_module = module.require('test.json');
      expect(test_module).to.deep.equal({
        test: [1, 2],
        a: 'b',
        c: { d: -1 }
      });
    });

    it('should expose a modified version of itself to submodules that translates relative paths to full paths', function(){

      var __readFileSync = sinon.stub();
      __readFileSync.onFirstCall().returns('module.exports = require("sub_module");');
      __readFileSync.onSecondCall().returns('module.exports={ global_data: "Hello World!" }');
      var context = {
        __readFileSync: __readFileSync
      };
      var module = getNewModuleVersion(context);

      var test_module = module.require('top_module');

      expect(test_module).to.have.property('global_data', 'Hello World!');
      expect(__readFileSync.secondCall.args).to.deep.equal([ 'top_module/contract_modules/sub_module' ]);

    });


  });

});
