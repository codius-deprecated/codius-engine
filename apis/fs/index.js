exports.init = function (engine, config) {
  engine.registerAPI('fs', function(runner){
    var manifest = runner.getManifest();
    var manifestHash = runner.getManifestHash();
    return new FileSystemReadOnly(config.contractsFilesystemPath, manifest, manifestHash);
  });
};


var fs          = require('fs');
var path_module = require('path');
var constants   = require('constants');

function FileSystemReadOnly(sandbox_filesystem_path, manifest, manifestHash) {
  var self = this;

  self._manifest = manifest;
  self._manifest_hash = manifestHash;
  self._sandbox_filesystem_path = sandbox_filesystem_path;

  self._openedFds = [];
}

FileSystemReadOnly.MANIFEST_PATH = '/codius-manifest.json';
FileSystemReadOnly.SUBMODULE_PREFIX = '/node_modules';
FileSystemReadOnly.HASH_REGEX = /^[0-9a-fA-F]{64}$/;

FileSystemReadOnly.methods = [
  'stat',
  'lstat',
  'fstat',
  'open',
  'close',
  'read'
];

// We don't really care about any of the stat properties of the virtual
// directories, so we just return something realistic.
// TODO Could be more realistic.
FileSystemReadOnly.STAT_FOR_DIRECTORIES = {
  dev: 2049,
  mode: 16893,
  nlink: 5,
  uid: 1000,
  gid: 1000,
  rdev: 0,
  blksize: 4096,
  ino: 6695080,
  size: 4096,
  blocks: 8,
  atime: 'Tue Oct 07 2014 11:02:22 GMT-0700 (PDT)',
  mtime: 'Tue Oct 07 2014 10:54:18 GMT-0700 (PDT)',
  ctime: 'Tue Oct 07 2014 10:54:18 GMT-0700 (PDT)'
};

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

FileSystemReadOnly.prototype.getMethod = function(name) {
  var self = this;

  if (FileSystemReadOnly.methods.indexOf(name) !== -1) {
    return self[name].bind(self);
  }

};


FileSystemReadOnly.prototype.stat = function(path, callback) {
  var self = this;

  var fileHash = this._translateFilenameToHash(path);
  if (fileHash) {
    fs.stat(self._sandbox_filesystem_path + fileHash, callback);
  } else {
    callback(FileSystemReadOnly._createSystemError(path, 'ENOENT', 'stat'));
  }
};

FileSystemReadOnly.prototype.lstat = function(path, callback) {
  var self = this;

  var fileHash = this._translateFilenameToHash(path);
  if (fileHash === 'dir') {
    callback(null, FileSystemReadOnly.STAT_FOR_DIRECTORIES);
  } else if (fileHash) {
    fs.lstat(self._sandbox_filesystem_path + fileHash, callback);
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

  var fileHash = this._translateFilenameToHash(path);
  if (fileHash) {
    fs.open(self._sandbox_filesystem_path + fileHash, 'r', function (error, fd) {
      if (!error) {
        self._openedFds[fd] = true;
      }
      callback(error, fd);
    });
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

    return manifestHash;

  // Case: Two special virtual directories: module root and node_modules folder
  } else if (path === '/.' || path === '/node_modules') {
    return 'dir';

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
      return _handleError(new Error('Cannot load manifest for module: "' + String(moduleName) + '". ' + error));
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
      return 'dir';
    } else {
      // Ensure the file hash is actually a hash
      if (!FileSystemReadOnly.HASH_REGEX.test(context)) {
        throw new Error('Security error: Invalid manifest hash');
      }

      return context;
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

