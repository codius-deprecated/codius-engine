exports.init = function (engine, config) {
  engine.registerAPI('fs', function (runner){
    var manifest = runner.getManifest();
    var manifestHash = runner.getManifestHash();
    return new FileSystemReadOnly({
      filesystemPath: config.contractsFilesystemPath,
      runtimeLibraryPath: config.runtimeLibraryPath,
      apis: config.apis,
      manifest: manifest,
      manifestHash: manifestHash
    });
  });
};


var fs          = require('fs');
var path_module = require('path');
var constants   = require('constants');
var util        = require('util');
var _           = require('lodash');

var ApiModule   = require('../../lib/api_module').ApiModule;

var VirtualDirectory = require('./virtual_directory').VirtualDirectory;
var VirtualFile = require('./virtual_file').VirtualFile;
var BuiltinFile = require('./builtin_file').BuiltinFile;

function FileSystemReadOnly(opts) {
  ApiModule.call(this);

  var self = this;

  self._manifest = opts.manifest;
  self._manifest_hash = opts.manifestHash;
  self._sandbox_filesystem_path = opts.filesystemPath;
  self._sandbox_runtime_library_path = opts.runtimeLibraryPath;
  self._sandbox_apis = opts.apis;

  self._availableApis = _.intersection(self._manifest.apis, self._sandbox_apis);

  self._openedFds = [];
}

util.inherits(FileSystemReadOnly, ApiModule);

FileSystemReadOnly.MANIFEST_PATH = '/codius-manifest.json';
FileSystemReadOnly.SUBMODULE_PREFIX = '/node_modules';
FileSystemReadOnly.HASH_REGEX = /^[0-9a-fA-F]{64}$/;
FileSystemReadOnly.GLOBAL_MODULE_PREFIX = '/usr/lib/node';
FileSystemReadOnly.GLOBAL_MODULE_EXTENSION = '.js';

FileSystemReadOnly.methods = [
  'stat',
  'lstat',
  'fstat',
  'open',
  'close',
  'read',
  'readdir'
];

FileSystemReadOnly._createSystemError = function (path, code, methodName) {
  if ("number" !== typeof constants[code]) {
    console.error('Tried to create error with invalid error code "'+code+'"');
    code = 'EFAULT';
  }

  var error = new Error(code+', '+methodName+' \''+path+'\'');
  error.errno = constants[code];
  error.code = code;
  error.path = path;
  return error;
}


FileSystemReadOnly.prototype.stat = function(path, callback) {
  var self = this;

  var file = this._translateFilenameToPath(path);
  if (file) {
    file.stat(callback);
  } else {
    callback(FileSystemReadOnly._createSystemError(path, 'ENOENT', 'stat'));
  }
};

FileSystemReadOnly.prototype.lstat = function(path, callback) {
  var self = this;

  var file = this._translateFilenameToPath(path);
  if (file) {
    file.lstat(callback);
  } else {
    callback(FileSystemReadOnly._createSystemError(path, 'ENOENT', 'lstat'));
  }
};

FileSystemReadOnly.prototype.fstat = function(fd, callback) {
  var self = this;

  if (!self._openedFds[fd]) {
    callback(FileSystemReadOnly._createSystemError(path, 'EBADF', 'fstat'));
    return;
  }

  fs.fstat(fd, callback);
};

FileSystemReadOnly.prototype.readdir = function(path, callback) {
  var self = this;

  var file = this._translateFilenameToPath(path);
  if (file && file.isDirectory()) {
    file.readdir(callback);
  } else if (file) {
    callback(FileSystemReadOnly._createSystemError(path, 'ENOTDIR', 'readdir'));
  } else {
    callback(FileSystemReadOnly._createSystemError(path, 'ENOENT', 'readdir'));
  }
};

/**
 *  Open file. Creates a file descriptor.
 *
 *  Note that we enforce a read-only policy here.
 *
 *  @param {String} path Stringified object with `path` and `options` fields
 *  @param {String} flags Ignored, we always use 'r'
 *  @param {Number} mode Ignored and no effect since we never allow file creation
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error
 *  @param {Number} fd File descriptor
 */
FileSystemReadOnly.prototype.open = function(path, flags, mode, callback) {
  var self = this;

  var file = this._translateFilenameToPath(path);
  if (file && !file.isDirectory()) {
    fs.open(file.getRealPath(), 'r', function (error, fd) {
      if (!error) {
        self._openedFds[fd] = true;
      }
      callback(error, fd);
    });
  } else if (file) {
    callback(FileSystemReadOnly._createSystemError(path, 'EISDIR', 'open'));
  } else {
    callback(FileSystemReadOnly._createSystemError(path, 'ENOENT', 'open'));
  }
};

FileSystemReadOnly.prototype.close = function(fd, callback) {
  var self = this;

  if (!self._openedFds[fd]) {
    callback(FileSystemReadOnly._createSystemError(path, 'EBADF', 'close'));
    return;
  }

  fs.close(fd, callback);
};

FileSystemReadOnly.prototype.read = function(fd, size, position, encoding, callback) {
  var self = this;

  if (!self._openedFds[fd]) {
    callback(FileSystemReadOnly._createSystemError(path, 'EBADF', 'read'));
    return;
  }

  // TODO Should not be using legacy API
  fs.read(fd, size, position, encoding, callback);
};

FileSystemReadOnly.prototype._translateFilenameToPath = function (path, manifest, manifestHash) {
  var self = this;

  if (!manifest) {
    manifest = self._manifest;
  }

  if (!manifestHash) {
    manifestHash = self._manifest_hash;
  }

  // Case: Global runtime modules ('/usr/lib/node/*.js')
  if (path.slice(0, FileSystemReadOnly.GLOBAL_MODULE_PREFIX.length) === FileSystemReadOnly.GLOBAL_MODULE_PREFIX &&
      path.slice(path.length - FileSystemReadOnly.GLOBAL_MODULE_EXTENSION.length) === FileSystemReadOnly.GLOBAL_MODULE_EXTENSION) {

    var moduleNameStartPos = FileSystemReadOnly.GLOBAL_MODULE_PREFIX.length + 1;
    var moduleNameEndPos = path.length - FileSystemReadOnly.GLOBAL_MODULE_EXTENSION.length;
    var requestedModule = path.slice(moduleNameStartPos, moduleNameEndPos);

    if (self._availableApis.indexOf(requestedModule) !== -1) {
      return new BuiltinFile(self._sandbox_runtime_library_path + requestedModule + FileSystemReadOnly.GLOBAL_MODULE_EXTENSION);
    } else {
      return false;
    }

  // Case: Simulate the directories /usr /usr/lib and /usr/lib/node
  } else if (path === '/usr') {
    return new VirtualDirectory(['lib']);

  } else if (path === '/usr/lib') {
    return new VirtualDirectory(['node']);

  } else if (path === '/usr/lib/node') {
    return new VirtualDirectory(self._availableApis.map(function (basename) {
      return basename + FileSystemReadOnly.GLOBAL_MODULE_EXTENSION;
    }));

  // Case: Virtual file system (any other file)
  } else {
    return self._translateFilenameToHash(path, manifest, manifestHash);
  }
};

FileSystemReadOnly.prototype._translateFilenameToHash = function (path, manifest, manifestHash) {
  var self = this;

  if (!manifest) {
    manifest = self._manifest;
  }

  if (!manifestHash) {
    manifestHash = self._manifest_hash;
  }

  if (typeof path !== "string") {
    throw new Error('Path must be a string.');
  }

  path = path_module.normalize(path);

  // Force path to be absolute
  // TODO To allow relative paths, we would need to keep track of the current
  //      working directory, which requires implementing chdir calls.
  if (path.length < 1 || path[0] !== '/') {
    path = '/' + path;
  }

  // Case: the file requested is the manifest
  if (path === FileSystemReadOnly.MANIFEST_PATH) {

    // Ensure the manifestHash is actually a hash
    if (!FileSystemReadOnly.HASH_REGEX.test(manifestHash)) {
      throw new Error('Security error: Invalid manifest hash');
    }

    return new VirtualFile(manifestHash, self._sandbox_filesystem_path);

  // Case: Special directory: module root
  } else if (path === '/' || path === '/.') {
    return new VirtualDirectory(Object.keys(manifest.files));

  // Case: Special directory: node_modules folder
  } else if (path === '/node_modules') {
    return new VirtualDirectory(Object.keys(manifest.modules));

  // Case: the file is from a submodule (node_modules)
  } else if (path.substr(0, FileSystemReadOnly.SUBMODULE_PREFIX.length) === FileSystemReadOnly.SUBMODULE_PREFIX) {
    // TODO What about escaped slashes? (Not allowed on unix it seems, but still a concern?)
    var moduleName = path.substr(FileSystemReadOnly.SUBMODULE_PREFIX.length+1).split('/')[0];
    if (!manifest.modules.hasOwnProperty(moduleName)) {
      return false;
    }

    // Load module manifest
    var moduleManifestHash = manifest.modules[moduleName];
    var moduleManifest;
    try {
      moduleManifest = fs.readFileSync(self._sandbox_filesystem_path + moduleManifestHash, { encoding: 'utf8' });
      moduleManifest = JSON.parse(moduleManifest);
    } catch(error) {
      throw new Error('Cannot load manifest for module: "' + String(moduleName) + '". ' + error);
    }

    // Get the remainder of the path and recurse to the submodule's manifest
    var restOfPath = path.substr(FileSystemReadOnly.SUBMODULE_PREFIX.length + 1 +
                                 moduleName.length);

    return self._translateFilenameToHash(restOfPath, moduleManifest, moduleManifestHash);

  // Case: the file is another file in the contract
  } else if (manifest.files.hasOwnProperty(path.split('/', 2)[1]) !== -1) {
    var context = manifest.files;
    var segments = path.split('/').slice(1);

    // Walk the path and descend into the manifest.files hierarchy
    for (var i = 0, l = segments.length; i < l; i++) {
      if (context.hasOwnProperty(segments[i])) {
        context = context[segments[i]];
      } else {
        return false;
      }
    }

    // Is it a directory?
    if (typeof context === 'object') {
      return new VirtualDirectory(Object.keys(context));
    } else {
      // Ensure the file hash is actually a hash
      if (!FileSystemReadOnly.HASH_REGEX.test(context)) {
        throw new Error('Security error: Invalid manifest hash');
      }

      // Constructor takes the hash of the file as an argument.
      return new VirtualFile(context, self._sandbox_filesystem_path);
    }
  } else {
    return false;
  }
};

// Helper function that handles errors sync or async
function _handleError(error, callback) {
  if (typeof callback === 'function') {
    callback(error);
    return;
  } else {
    throw error;
  }
}

