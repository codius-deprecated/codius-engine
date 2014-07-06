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

    it('should request the correct paths within submodules', function(){
      var context = { __readFileSync: sinon.stub() };
      context.__readFileSync.withArgs('a').returns('module.exports=require("b")');

      var module = getNewModuleVersion(context);
      var a = module.require('a');

      expect(context.__readFileSync).to.be.calledTwice;
      expect(context.__readFileSync.secondCall.args).to.deep.equal(['a/codius_modules/b']);
    });

    it('should request the correct paths within subfolders', function(){
      var context = { __readFileSync: sinon.stub(), console: { log: console.log } };
      context.__readFileSync.withArgs('lib/test.js').returns('module.exports=require("./other_test.js")');

      var module = getNewModuleVersion(context);
      var a = module.require('./lib/test.js');

      expect(context.__readFileSync).to.be.calledTwice;
      expect(context.__readFileSync.secondCall.args).to.deep.equal(['lib/other_test.js']);
    });

    it('should request the correct paths for specific files required from submodules', function(){
      var context = { __readFileSync: sinon.stub(), console: { log: console.log } };
      context.__readFileSync.withArgs('a').returns('module.exports=require("./codius_modules/b/lib/test.js")');

      var module = getNewModuleVersion(context);
      var a = module.require('a');

      expect(context.__readFileSync).to.be.calledTwice;
      expect(context.__readFileSync.secondCall.args).to.deep.equal(['a/codius_modules/b/lib/test.js']);
    });

    it('should request the correct paths when requesting a specific sub-sub-module', function(){
      var context = { __readFileSync: sinon.stub() };
      context.__readFileSync.withArgs('a/codius_modules/b').returns('module.exports=require("./lib/test.js")');

      var module = getNewModuleVersion(context);
      var a = module.require('a/codius_modules/b');

      expect(context.__readFileSync).to.be.calledTwice;
      expect(context.__readFileSync.secondCall.args).to.deep.equal(['a/codius_modules/b/lib/test.js']);
    });

  });

});
