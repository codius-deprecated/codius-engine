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
      var context = { __readFileSync: sinon.stub() };
      var module = getNewModuleVersion(context);
      expect(function(){ module.require('./test.txt'); }).to.throw(/require can only be used to load modules, javascript files, and JSON files/);
    });

    it('should call __readFileSync with the module_identifier', function(){
      var context = { __readFileSync: sinon.spy() };
      var module = getNewModuleVersion(context);
      var test_module = module.require('module_id');
      expect(context.__readFileSync).to.have.been.calledOnce;
      expect(context.__readFileSync.firstCall.args).to.deep.equal(['module_id']);
    });

    it('should eval and extract the module.exports from javascript files', function(){
      var context = { __readFileSync: sinon.stub() };
      context.__readFileSync.returns('module.exports={ global_data: "Hello World!" }');
      var module = getNewModuleVersion(context);
      var test_module = module.require('module_id');
      expect(test_module).to.have.property('global_data', 'Hello World!');
    });

    it('should parse json files', function(){
      var context = { __readFileSync: sinon.stub() };
      context.__readFileSync.returns('{"test":[1,2],"a":"b","c":{"d":-1}}');
      var module = getNewModuleVersion(context);

      var test_module = module.require('test.json');
      expect(test_module).to.deep.equal({
        test: [1, 2],
        a: 'b',
        c: { d: -1 }
      });
    });

    it('should expose a modified version of itself to submodules that translates relative paths to full paths', function(){
      var context = { __readFileSync: sinon.stub() };
      context.__readFileSync.onFirstCall().returns('module.exports = require("sub_module");');
      context.__readFileSync.onSecondCall().returns('module.exports={ global_data: "Hello World!" }');
      var module = getNewModuleVersion(context);
      var test_module = module.require('top_module');

      expect(test_module).to.have.property('global_data', 'Hello World!');
      expect(context.__readFileSync.secondCall.args).to.deep.equal([ 'top_module/contract_modules/sub_module' ]);
    });

    it.only('should call __readFileSync with full paths that are normalizeable by the Node.js path module', function(){
      var context = { __readFileSync: sinon.stub(), console: { log: console.log } };
      context.__readFileSync.onFirstCall().returns('require("sub_module");');
      context.__readFileSync.onSecondCall().returns('require("./contract_modules/sub_sub_module/somefile.js");');
      // context.__readFileSync.onThirdCall().returns('module.exports={ global_data: "Hello World!" }');
      var module = getNewModuleVersion(context);
      var test_module = module.require('top_module');

      expect(context.__readFileSync.thirdCall.args).to.deep.equal([ 'top_module/contract_modules/sub_module/contract_modules/sub_sub_module/somefile.js' ]);
    });


  });

});
