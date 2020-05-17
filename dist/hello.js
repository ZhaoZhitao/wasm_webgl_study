var Module = typeof Module !== 'undefined' ? Module : {};
var moduleOverrides = {};
var key;
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key]
  }
}
var arguments_ = [];
var thisProgram = './this.program';
var quit_ = function(status, toThrow) {
  throw toThrow
};
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === 'object';
ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
ENVIRONMENT_IS_NODE = typeof process === 'object' &&
    typeof process.versions === 'object' &&
    typeof process.versions.node === 'string';
ENVIRONMENT_IS_SHELL =
    !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory)
  }
  return scriptDirectory + path
}
var read_, readAsync, readBinary, setWindowTitle;
var nodeFS;
var nodePath;
if (ENVIRONMENT_IS_NODE) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = require('path').dirname(scriptDirectory) + '/'
  } else {
    scriptDirectory = __dirname + '/'
  }
  read_ = function shell_read(filename, binary) {
    if (!nodeFS) nodeFS = require('fs');
    if (!nodePath) nodePath = require('path');
    filename = nodePath['normalize'](filename);
    return nodeFS['readFileSync'](filename, binary ? null : 'utf8')
  };
  readBinary = function readBinary(filename) {
    var ret = read_(filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret)
    }
    assert(ret.buffer);
    return ret
  };
  if (process['argv'].length > 1) {
    thisProgram = process['argv'][1].replace(/\\/g, '/')
  }
  arguments_ = process['argv'].slice(2);
  if (typeof module !== 'undefined') {
    module['exports'] = Module
  }
  process['on']('uncaughtException', function(ex) {
    if (!(ex instanceof ExitStatus)) {
      throw ex
    }
  });
  process['on']('unhandledRejection', abort);
  quit_ = function(status) {
    process['exit'](status)
  };
  Module['inspect'] = function() {
    return '[Emscripten Module object]'
  }
} else if (ENVIRONMENT_IS_SHELL) {
  if (typeof read != 'undefined') {
    read_ = function shell_read(f) {
      return read(f)
    }
  }
  readBinary = function readBinary(f) {
    var data;
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f))
    }
    data = read(f, 'binary');
    assert(typeof data === 'object');
    return data
  };
  if (typeof scriptArgs != 'undefined') {
    arguments_ = scriptArgs
  } else if (typeof arguments != 'undefined') {
    arguments_ = arguments
  }
  if (typeof quit === 'function') {
    quit_ = function(status) {
      quit(status)
    }
  }
  if (typeof print !== 'undefined') {
    if (typeof console === 'undefined') console = {};
    console.log = print;
    console.warn = console.error =
        typeof printErr !== 'undefined' ? printErr : print
  }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = self.location.href
  } else if (document.currentScript) {
    scriptDirectory = document.currentScript.src
  }
  if (scriptDirectory.indexOf('blob:') !== 0) {
    scriptDirectory =
        scriptDirectory.substr(0, scriptDirectory.lastIndexOf('/') + 1)
  } else {
    scriptDirectory = ''
  }
  {
    read_ = function shell_read(url) {
      var xhr = new XMLHttpRequest;
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText
    };
    if (ENVIRONMENT_IS_WORKER) {
      readBinary = function readBinary(url) {
        var xhr = new XMLHttpRequest;
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send(null);
        return new Uint8Array(xhr.response)
      }
    }
    readAsync = function readAsync(url, onload, onerror) {
      var xhr = new XMLHttpRequest;
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function xhr_onload() {
        if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
          onload(xhr.response);
          return
        }
        onerror()
      };
      xhr.onerror = onerror;
      xhr.send(null)
    }
  }
  setWindowTitle = function(title) {
    document.title = title
  }
} else {
}
var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.warn.bind(console);
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key]
  }
}
moduleOverrides = null;
if (Module['arguments']) arguments_ = Module['arguments'];
if (Module['thisProgram']) thisProgram = Module['thisProgram'];
if (Module['quit']) quit_ = Module['quit'];
var wasmBinary;
if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];
var noExitRuntime;
if (Module['noExitRuntime']) noExitRuntime = Module['noExitRuntime'];
if (typeof WebAssembly !== 'object') {
  err('no native wasm support detected')
}
var wasmMemory;
var wasmTable = new WebAssembly.Table(
    {'initial': 4, 'maximum': 4 + 0, 'element': 'anyfunc'});
var ABORT = false;
var EXITSTATUS = 0;
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text)
  }
}
function getCFunc(ident) {
  var func = Module['_' + ident];
  assert(
      func,
      'Cannot call unknown function ' + ident + ', make sure it is exported');
  return func
}
function ccall(ident, returnType, argTypes, args, opts) {
  var toC = {
    'string': function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) {
        var len = (str.length << 2) + 1;
        ret = stackAlloc(len);
        stringToUTF8(str, ret, len)
      }
      return ret
    },
    'array': function(arr) {
      var ret = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret
    }
  };
  function convertReturnValue(ret) {
    if (returnType === 'string') return UTF8ToString(ret);
    if (returnType === 'boolean') return Boolean(ret);
    return ret
  }
  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]];
      if (converter) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = converter(args[i])
      } else {
        cArgs[i] = args[i]
      }
    }
  }
  var ret = func.apply(null, cArgs);
  ret = convertReturnValue(ret);
  if (stack !== 0) stackRestore(stack);
  return ret
}
var UTF8Decoder =
    typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;
function UTF8ArrayToString(heap, idx, maxBytesToRead) {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  while (heap[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  if (endPtr - idx > 16 && heap.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(heap.subarray(idx, endPtr))
  } else {
    var str = '';
    while (idx < endPtr) {
      var u0 = heap[idx++];
      if (!(u0 & 128)) {
        str += String.fromCharCode(u0);
        continue
      }
      var u1 = heap[idx++] & 63;
      if ((u0 & 224) == 192) {
        str += String.fromCharCode((u0 & 31) << 6 | u1);
        continue
      }
      var u2 = heap[idx++] & 63;
      if ((u0 & 240) == 224) {
        u0 = (u0 & 15) << 12 | u1 << 6 | u2
      } else {
        u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heap[idx++] & 63
      }
      if (u0 < 65536) {
        str += String.fromCharCode(u0)
      } else {
        var ch = u0 - 65536;
        str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
      }
    }
  }
  return str
}
function UTF8ToString(ptr, maxBytesToRead) {
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : ''
}
function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) return 0;
  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343) {
      var u1 = str.charCodeAt(++i);
      u = 65536 + ((u & 1023) << 10) | u1 & 1023
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break;
      heap[outIdx++] = u
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++] = 192 | u >> 6;
      heap[outIdx++] = 128 | u & 63
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++] = 224 | u >> 12;
      heap[outIdx++] = 128 | u >> 6 & 63;
      heap[outIdx++] = 128 | u & 63
    } else {
      if (outIdx + 3 >= endIdx) break;
      heap[outIdx++] = 240 | u >> 18;
      heap[outIdx++] = 128 | u >> 12 & 63;
      heap[outIdx++] = 128 | u >> 6 & 63;
      heap[outIdx++] = 128 | u & 63
    }
  }
  heap[outIdx] = 0;
  return outIdx - startIdx
}
function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
}
function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343)
      u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
    if (u <= 127)
      ++len;
    else if (u <= 2047)
      len += 2;
    else if (u <= 65535)
      len += 3;
    else
      len += 4
  }
  return len
}
function allocateUTF8OnStack(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8Array(str, HEAP8, ret, size);
  return ret
}
function writeArrayToMemory(array, buffer) {
  HEAP8.set(array, buffer)
}
var WASM_PAGE_SIZE = 65536;
function alignUp(x, multiple) {
  if (x % multiple > 0) {
    x += multiple - x % multiple
  }
  return x
}
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
function updateGlobalBufferAndViews(buf) {
  buffer = buf;
  Module['HEAP8'] = HEAP8 = new Int8Array(buf);
  Module['HEAP16'] = HEAP16 = new Int16Array(buf);
  Module['HEAP32'] = HEAP32 = new Int32Array(buf);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buf);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buf);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buf);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buf);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buf)
}
var DYNAMIC_BASE = 5247712, DYNAMICTOP_PTR = 4672;
var INITIAL_INITIAL_MEMORY = Module['INITIAL_MEMORY'] || 16777216;
if (Module['wasmMemory']) {
  wasmMemory = Module['wasmMemory']
} else {
  wasmMemory = new WebAssembly.Memory({
    'initial': INITIAL_INITIAL_MEMORY / WASM_PAGE_SIZE,
    'maximum': 2147483648 / WASM_PAGE_SIZE
  })
}
if (wasmMemory) {
  buffer = wasmMemory.buffer
}
INITIAL_INITIAL_MEMORY = buffer.byteLength;
updateGlobalBufferAndViews(buffer);
HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
function callRuntimeCallbacks(callbacks) {
  while (callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback(Module);
      continue
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Module['dynCall_v'](func)
      } else {
        Module['dynCall_vi'](func, callback.arg)
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg)
    }
  }
}
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;
function preRun() {
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function')
      Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift())
    }
  }
  callRuntimeCallbacks(__ATPRERUN__)
}
function initRuntime() {
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__)
}
function preMain() {
  callRuntimeCallbacks(__ATMAIN__)
}
function exitRuntime() {
  runtimeExited = true
}
function postRun() {
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function')
      Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift())
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__)
}
function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb)
}
function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb)
}
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies)
  }
}
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies)
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback()
    }
  }
}
Module['preloadedImages'] = {};
Module['preloadedAudios'] = {};
function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what)
  }
  what += '';
  out(what);
  err(what);
  ABORT = true;
  EXITSTATUS = 1;
  what = 'abort(' + what + '). Build with -s ASSERTIONS=1 for more info.';
  throw new WebAssembly.RuntimeError(what)
}
function hasPrefix(str, prefix) {
  return String.prototype.startsWith ? str.startsWith(prefix) :
                                       str.indexOf(prefix) === 0
}
var dataURIPrefix = 'data:application/octet-stream;base64,';
function isDataURI(filename) {
  return hasPrefix(filename, dataURIPrefix)
}
var fileURIPrefix = 'file://';
function isFileURI(filename) {
  return hasPrefix(filename, fileURIPrefix)
}
var wasmBinaryFile = 'hello.wasm';
if (!isDataURI(wasmBinaryFile)) {
  wasmBinaryFile = locateFile(wasmBinaryFile)
}
function getBinary() {
  try {
    if (wasmBinary) {
      return new Uint8Array(wasmBinary)
    }
    if (readBinary) {
      return readBinary(wasmBinaryFile)
    } else {
      throw 'both async and sync fetching of the wasm failed'
    }
  } catch (err) {
    abort(err)
  }
}
function getBinaryPromise() {
  if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) &&
      typeof fetch === 'function' && !isFileURI(wasmBinaryFile)) {
    return fetch(wasmBinaryFile, {credentials: 'same-origin'})
        .then(function(response) {
          if (!response['ok']) {
            throw 'failed to load wasm binary file at \'' + wasmBinaryFile +
                '\''
          }
          return response['arrayBuffer']()
        })
        .catch(function() {
          return getBinary()
        })
  }
  return new Promise(function(resolve, reject) {
    resolve(getBinary())
  })
}
function createWasm() {
  var info = {'a': asmLibraryArg};
  function receiveInstance(instance, module) {
    var exports = instance.exports;
    Module['asm'] = exports;
    removeRunDependency('wasm-instantiate')
  }
  addRunDependency('wasm-instantiate');
  function receiveInstantiatedSource(output) {
    receiveInstance(output['instance'])
  }
  function instantiateArrayBuffer(receiver) {
    return getBinaryPromise()
        .then(function(binary) {
          return WebAssembly.instantiate(binary, info)
        })
        .then(receiver, function(reason) {
          err('failed to asynchronously prepare wasm: ' + reason);
          abort(reason)
        })
  }
  function instantiateAsync() {
    if (!wasmBinary && typeof WebAssembly.instantiateStreaming === 'function' &&
        !isDataURI(wasmBinaryFile) && !isFileURI(wasmBinaryFile) &&
        typeof fetch === 'function') {
      fetch(wasmBinaryFile, {
        credentials: 'same-origin'
      }).then(function(response) {
        var result = WebAssembly.instantiateStreaming(response, info);
        return result.then(receiveInstantiatedSource, function(reason) {
          err('wasm streaming compile failed: ' + reason);
          err('falling back to ArrayBuffer instantiation');
          instantiateArrayBuffer(receiveInstantiatedSource)
        })
      })
    } else {
      return instantiateArrayBuffer(receiveInstantiatedSource)
    }
  }
  if (Module['instantiateWasm']) {
    try {
      var exports = Module['instantiateWasm'](info, receiveInstance);
      return exports
    } catch (e) {
      err('Module.instantiateWasm callback failed with error: ' + e);
      return false
    }
  }
  instantiateAsync();
  return {}
}
var ASM_CONSTS = {
  1731: function() {
    if (typeof window != 'undefined') {
      window.dispatchEvent(new CustomEvent('wasmLoaded'))
    } else {
      global.onWASMLoaded && global.onWASMLoaded()
    }
  }
};
function _emscripten_asm_const_iii(code, sigPtr, argbuf) {
  var args = readAsmConstArgs(sigPtr, argbuf);
  return ASM_CONSTS[code].apply(null, args)
}
__ATINIT__.push({
  func: function() {
    ___wasm_call_ctors()
  }
});
function _abort() {
  abort()
}
function _emscripten_memcpy_big(dest, src, num) {
  HEAPU8.copyWithin(dest, src, src + num)
}
function _emscripten_get_heap_size() {
  return HEAPU8.length
}
function emscripten_realloc_buffer(size) {
  try {
    wasmMemory.grow(size - buffer.byteLength + 65535 >>> 16);
    updateGlobalBufferAndViews(wasmMemory.buffer);
    return 1
  } catch (e) {
  }
}
function _emscripten_resize_heap(requestedSize) {
  requestedSize = requestedSize >>> 0;
  var oldSize = _emscripten_get_heap_size();
  var PAGE_MULTIPLE = 65536;
  var maxHeapSize = 2147483648;
  if (requestedSize > maxHeapSize) {
    return false
  }
  var minHeapSize = 16777216;
  for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
    var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
    overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
    var newSize = Math.min(
        maxHeapSize,
        alignUp(
            Math.max(minHeapSize, requestedSize, overGrownHeapSize),
            PAGE_MULTIPLE));
    var replacement = emscripten_realloc_buffer(newSize);
    if (replacement) {
      return true
    }
  }
  return false
}
function __webgl_enable_ANGLE_instanced_arrays(ctx) {
  var ext = ctx.getExtension('ANGLE_instanced_arrays');
  if (ext) {
    ctx['vertexAttribDivisor'] = function(index, divisor) {
      ext['vertexAttribDivisorANGLE'](index, divisor)
    };
    ctx['drawArraysInstanced'] = function(mode, first, count, primcount) {
      ext['drawArraysInstancedANGLE'](mode, first, count, primcount)
    };
    ctx['drawElementsInstanced'] = function(
        mode, count, type, indices, primcount) {
      ext['drawElementsInstancedANGLE'](mode, count, type, indices, primcount)
    };
    return 1
  }
}
function __webgl_enable_OES_vertex_array_object(ctx) {
  var ext = ctx.getExtension('OES_vertex_array_object');
  if (ext) {
    ctx['createVertexArray'] = function() {
      return ext['createVertexArrayOES']()
    };
    ctx['deleteVertexArray'] = function(vao) {
      ext['deleteVertexArrayOES'](vao)
    };
    ctx['bindVertexArray'] = function(vao) {
      ext['bindVertexArrayOES'](vao)
    };
    ctx['isVertexArray'] = function(vao) {
      return ext['isVertexArrayOES'](vao)
    };
    return 1
  }
}
function __webgl_enable_WEBGL_draw_buffers(ctx) {
  var ext = ctx.getExtension('WEBGL_draw_buffers');
  if (ext) {
    ctx['drawBuffers'] = function(n, bufs) {
      ext['drawBuffersWEBGL'](n, bufs)
    };
    return 1
  }
}
function __webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(ctx) {
  return !!(
      ctx.dibvbi =
          ctx.getExtension('WEBGL_draw_instanced_base_vertex_base_instance'))
}
var GL = {
  counter: 1,
  lastError: 0,
  buffers: [],
  mappedBuffers: {},
  programs: [],
  framebuffers: [],
  renderbuffers: [],
  textures: [],
  uniforms: [],
  shaders: [],
  vaos: [],
  contexts: [],
  currentContext: null,
  offscreenCanvases: {},
  timerQueriesEXT: [],
  queries: [],
  samplers: [],
  transformFeedbacks: [],
  syncs: [],
  currArrayBuffer: 0,
  currElementArrayBuffer: 0,
  byteSizeByTypeRoot: 5120,
  byteSizeByType: [1, 1, 2, 2, 4, 4, 4, 2, 3, 4, 8],
  programInfos: {},
  stringCache: {},
  stringiCache: {},
  unpackAlignment: 4,
  init: function() {
    var miniTempFloatBuffer = new Float32Array(GL.MINI_TEMP_BUFFER_SIZE);
    for (var i = 0; i < GL.MINI_TEMP_BUFFER_SIZE; i++) {
      GL.miniTempBufferFloatViews[i] = miniTempFloatBuffer.subarray(0, i + 1)
    }
    var miniTempIntBuffer = new Int32Array(GL.MINI_TEMP_BUFFER_SIZE);
    for (var i = 0; i < GL.MINI_TEMP_BUFFER_SIZE; i++) {
      GL.miniTempBufferIntViews[i] = miniTempIntBuffer.subarray(0, i + 1)
    }
  },
  recordError: function recordError(errorCode) {
    if (!GL.lastError) {
      GL.lastError = errorCode
    }
  },
  getNewId: function(table) {
    var ret = GL.counter++;
    for (var i = table.length; i < ret; i++) {
      table[i] = null
    }
    return ret
  },
  MINI_TEMP_BUFFER_SIZE: 256,
  miniTempBufferFloatViews: [0],
  miniTempBufferIntViews: [0],
  MAX_TEMP_BUFFER_SIZE: 2097152,
  numTempVertexBuffersPerSize: 64,
  log2ceilLookup: function(i) {
    return 32 - Math.clz32(i - 1)
  },
  generateTempBuffers: function(quads, context) {
    var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
    context.tempVertexBufferCounters1 = [];
    context.tempVertexBufferCounters2 = [];
    context.tempVertexBufferCounters1.length =
        context.tempVertexBufferCounters2.length = largestIndex + 1;
    context.tempVertexBuffers1 = [];
    context.tempVertexBuffers2 = [];
    context.tempVertexBuffers1.length = context.tempVertexBuffers2.length =
        largestIndex + 1;
    context.tempIndexBuffers = [];
    context.tempIndexBuffers.length = largestIndex + 1;
    for (var i = 0; i <= largestIndex; ++i) {
      context.tempIndexBuffers[i] = null;
      context.tempVertexBufferCounters1[i] =
          context.tempVertexBufferCounters2[i] = 0;
      var ringbufferLength = GL.numTempVertexBuffersPerSize;
      context.tempVertexBuffers1[i] = [];
      context.tempVertexBuffers2[i] = [];
      var ringbuffer1 = context.tempVertexBuffers1[i];
      var ringbuffer2 = context.tempVertexBuffers2[i];
      ringbuffer1.length = ringbuffer2.length = ringbufferLength;
      for (var j = 0; j < ringbufferLength; ++j) {
        ringbuffer1[j] = ringbuffer2[j] = null
      }
    }
    if (quads) {
      context.tempQuadIndexBuffer = GLctx.createBuffer();
      context.GLctx.bindBuffer(34963, context.tempQuadIndexBuffer);
      var numIndexes = GL.MAX_TEMP_BUFFER_SIZE >> 1;
      var quadIndexes = new Uint16Array(numIndexes);
      var i = 0, v = 0;
      while (1) {
        quadIndexes[i++] = v;
        if (i >= numIndexes) break;
        quadIndexes[i++] = v + 1;
        if (i >= numIndexes) break;
        quadIndexes[i++] = v + 2;
        if (i >= numIndexes) break;
        quadIndexes[i++] = v;
        if (i >= numIndexes) break;
        quadIndexes[i++] = v + 2;
        if (i >= numIndexes) break;
        quadIndexes[i++] = v + 3;
        if (i >= numIndexes) break;
        v += 4
      }
      context.GLctx.bufferData(34963, quadIndexes, 35044);
      context.GLctx.bindBuffer(34963, null)
    }
  },
  getTempVertexBuffer: function getTempVertexBuffer(sizeBytes) {
    var idx = GL.log2ceilLookup(sizeBytes);
    var ringbuffer = GL.currentContext.tempVertexBuffers1[idx];
    var nextFreeBufferIndex = GL.currentContext.tempVertexBufferCounters1[idx];
    GL.currentContext.tempVertexBufferCounters1[idx] =
        GL.currentContext.tempVertexBufferCounters1[idx] + 1 &
        GL.numTempVertexBuffersPerSize - 1;
    var vbo = ringbuffer[nextFreeBufferIndex];
    if (vbo) {
      return vbo
    }
    var prevVBO = GLctx.getParameter(34964);
    ringbuffer[nextFreeBufferIndex] = GLctx.createBuffer();
    GLctx.bindBuffer(34962, ringbuffer[nextFreeBufferIndex]);
    GLctx.bufferData(34962, 1 << idx, 35048);
    GLctx.bindBuffer(34962, prevVBO);
    return ringbuffer[nextFreeBufferIndex]
  },
  getTempIndexBuffer: function getTempIndexBuffer(sizeBytes) {
    var idx = GL.log2ceilLookup(sizeBytes);
    var ibo = GL.currentContext.tempIndexBuffers[idx];
    if (ibo) {
      return ibo
    }
    var prevIBO = GLctx.getParameter(34965);
    GL.currentContext.tempIndexBuffers[idx] = GLctx.createBuffer();
    GLctx.bindBuffer(34963, GL.currentContext.tempIndexBuffers[idx]);
    GLctx.bufferData(34963, 1 << idx, 35048);
    GLctx.bindBuffer(34963, prevIBO);
    return GL.currentContext.tempIndexBuffers[idx]
  },
  newRenderingFrameStarted: function newRenderingFrameStarted() {
    if (!GL.currentContext) {
      return
    }
    var vb = GL.currentContext.tempVertexBuffers1;
    GL.currentContext.tempVertexBuffers1 = GL.currentContext.tempVertexBuffers2;
    GL.currentContext.tempVertexBuffers2 = vb;
    vb = GL.currentContext.tempVertexBufferCounters1;
    GL.currentContext.tempVertexBufferCounters1 =
        GL.currentContext.tempVertexBufferCounters2;
    GL.currentContext.tempVertexBufferCounters2 = vb;
    var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
    for (var i = 0; i <= largestIndex; ++i) {
      GL.currentContext.tempVertexBufferCounters1[i] = 0
    }
  },
  getSource: function(shader, count, string, length) {
    var source = '';
    for (var i = 0; i < count; ++i) {
      var len = length ? HEAP32[length + i * 4 >> 2] : -1;
      source +=
          UTF8ToString(HEAP32[string + i * 4 >> 2], len < 0 ? undefined : len)
    }
    return source
  },
  calcBufLength: function calcBufLength(size, type, stride, count) {
    if (stride > 0) {
      return count * stride
    }
    var typeSize = GL.byteSizeByType[type - GL.byteSizeByTypeRoot];
    return size * typeSize * count
  },
  usedTempBuffers: [],
  preDrawHandleClientVertexAttribBindings:
      function preDrawHandleClientVertexAttribBindings(count) {
        GL.resetBufferBinding = false;
        for (var i = 0; i < GL.currentContext.maxVertexAttribs; ++i) {
          var cb = GL.currentContext.clientBuffers[i];
          if (!cb.clientside || !cb.enabled) continue;
          GL.resetBufferBinding = true;
          var size = GL.calcBufLength(cb.size, cb.type, cb.stride, count);
          var buf = GL.getTempVertexBuffer(size);
          GLctx.bindBuffer(34962, buf);
          GLctx.bufferSubData(34962, 0, HEAPU8.subarray(cb.ptr, cb.ptr + size));
          cb.vertexAttribPointerAdaptor.call(
              GLctx, i, cb.size, cb.type, cb.normalized, cb.stride, 0)
        }
      },
  postDrawHandleClientVertexAttribBindings:
      function postDrawHandleClientVertexAttribBindings() {
        if (GL.resetBufferBinding) {
          GLctx.bindBuffer(34962, GL.buffers[GL.currArrayBuffer])
        }
      },
  createContext: function(canvas, webGLContextAttributes) {
    var ctx = webGLContextAttributes.majorVersion > 1 ?
        canvas.getContext('webgl2', webGLContextAttributes) :
        canvas.getContext('webgl', webGLContextAttributes);
    if (!ctx) return 0;
    var handle = GL.registerContext(ctx, webGLContextAttributes);
    return handle
  },
  registerContext: function(ctx, webGLContextAttributes) {
    var handle = GL.getNewId(GL.contexts);
    var context = {
      handle: handle,
      attributes: webGLContextAttributes,
      version: webGLContextAttributes.majorVersion,
      GLctx: ctx
    };
    if (ctx.canvas) ctx.canvas.GLctxObject = context;
    GL.contexts[handle] = context;
    if (typeof webGLContextAttributes.enableExtensionsByDefault ===
            'undefined' ||
        webGLContextAttributes.enableExtensionsByDefault) {
      GL.initExtensions(context)
    }
    context.maxVertexAttribs = context.GLctx.getParameter(34921);
    context.clientBuffers = [];
    for (var i = 0; i < context.maxVertexAttribs; i++) {
      context.clientBuffers[i] = {
        enabled: false,
        clientside: false,
        size: 0,
        type: 0,
        normalized: 0,
        stride: 0,
        ptr: 0,
        vertexAttribPointerAdaptor: null
      }
    }
    GL.generateTempBuffers(false, context);
    return handle
  },
  makeContextCurrent: function(contextHandle) {
    GL.currentContext = GL.contexts[contextHandle];
    Module.ctx = GLctx = GL.currentContext && GL.currentContext.GLctx;
    return !(contextHandle && !GLctx)
  },
  getContext: function(contextHandle) {
    return GL.contexts[contextHandle]
  },
  deleteContext: function(contextHandle) {
    if (GL.currentContext === GL.contexts[contextHandle])
      GL.currentContext = null;
    if (typeof JSEvents === 'object')
      JSEvents.removeAllHandlersOnTarget(
          GL.contexts[contextHandle].GLctx.canvas);
    if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas)
      GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
    GL.contexts[contextHandle] = null
  },
  initExtensions: function(context) {
    if (!context) context = GL.currentContext;
    if (context.initExtensionsDone) return;
    context.initExtensionsDone = true;
    var GLctx = context.GLctx;
    __webgl_enable_ANGLE_instanced_arrays(GLctx);
    __webgl_enable_OES_vertex_array_object(GLctx);
    __webgl_enable_WEBGL_draw_buffers(GLctx);
    __webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(GLctx);
    GLctx.disjointTimerQueryExt =
        GLctx.getExtension('EXT_disjoint_timer_query');
    var automaticallyEnabledExtensions = [
      'OES_texture_float',
      'OES_texture_half_float',
      'OES_standard_derivatives',
      'OES_vertex_array_object',
      'WEBGL_compressed_texture_s3tc',
      'WEBGL_depth_texture',
      'OES_element_index_uint',
      'EXT_texture_filter_anisotropic',
      'EXT_frag_depth',
      'WEBGL_draw_buffers',
      'ANGLE_instanced_arrays',
      'OES_texture_float_linear',
      'OES_texture_half_float_linear',
      'EXT_blend_minmax',
      'EXT_shader_texture_lod',
      'EXT_texture_norm16',
      'WEBGL_compressed_texture_pvrtc',
      'EXT_color_buffer_half_float',
      'WEBGL_color_buffer_float',
      'EXT_sRGB',
      'WEBGL_compressed_texture_etc1',
      'EXT_disjoint_timer_query',
      'WEBGL_compressed_texture_etc',
      'WEBGL_compressed_texture_astc',
      'EXT_color_buffer_float',
      'WEBGL_compressed_texture_s3tc_srgb',
      'EXT_disjoint_timer_query_webgl2',
      'WEBKIT_WEBGL_compressed_texture_pvrtc'
    ];
    var exts = GLctx.getSupportedExtensions() || [];
    exts.forEach(function(ext) {
      if (automaticallyEnabledExtensions.indexOf(ext) != -1) {
        GLctx.getExtension(ext)
      }
    })
  },
  populateUniformTable: function(program) {
    var p = GL.programs[program];
    var ptable = GL.programInfos[program] = {
      uniforms: {},
      maxUniformLength: 0,
      maxAttributeLength: -1,
      maxUniformBlockNameLength: -1
    };
    var utable = ptable.uniforms;
    var numUniforms = GLctx.getProgramParameter(p, 35718);
    for (var i = 0; i < numUniforms; ++i) {
      var u = GLctx.getActiveUniform(p, i);
      var name = u.name;
      ptable.maxUniformLength =
          Math.max(ptable.maxUniformLength, name.length + 1);
      if (name.slice(-1) == ']') {
        name = name.slice(0, name.lastIndexOf('['))
      }
      var loc = GLctx.getUniformLocation(p, name);
      if (loc) {
        var id = GL.getNewId(GL.uniforms);
        utable[name] = [u.size, id];
        GL.uniforms[id] = loc;
        for (var j = 1; j < u.size; ++j) {
          var n = name + '[' + j + ']';
          loc = GLctx.getUniformLocation(p, n);
          id = GL.getNewId(GL.uniforms);
          GL.uniforms[id] = loc
        }
      }
    }
  }
};
var JSEvents = {
  keyEvent: 0,
  mouseEvent: 0,
  wheelEvent: 0,
  uiEvent: 0,
  focusEvent: 0,
  deviceOrientationEvent: 0,
  deviceMotionEvent: 0,
  fullscreenChangeEvent: 0,
  pointerlockChangeEvent: 0,
  visibilityChangeEvent: 0,
  touchEvent: 0,
  previousFullscreenElement: null,
  previousScreenX: null,
  previousScreenY: null,
  removeEventListenersRegistered: false,
  removeAllEventListeners: function() {
    for (var i = JSEvents.eventHandlers.length - 1; i >= 0; --i) {
      JSEvents._removeHandler(i)
    }
    JSEvents.eventHandlers = [];
    JSEvents.deferredCalls = []
  },
  registerRemoveEventListeners: function() {
    if (!JSEvents.removeEventListenersRegistered) {
      __ATEXIT__.push(JSEvents.removeAllEventListeners);
      JSEvents.removeEventListenersRegistered = true
    }
  },
  deferredCalls: [],
  deferCall: function(targetFunction, precedence, argsList) {
    function arraysHaveEqualContent(arrA, arrB) {
      if (arrA.length != arrB.length) return false;
      for (var i in arrA) {
        if (arrA[i] != arrB[i]) return false
      }
      return true
    }
    for (var i in JSEvents.deferredCalls) {
      var call = JSEvents.deferredCalls[i];
      if (call.targetFunction == targetFunction &&
          arraysHaveEqualContent(call.argsList, argsList)) {
        return
      }
    }
    JSEvents.deferredCalls.push({
      targetFunction: targetFunction,
      precedence: precedence,
      argsList: argsList
    });
    JSEvents.deferredCalls.sort(function(x, y) {
      return x.precedence < y.precedence
    })
  },
  removeDeferredCalls: function(targetFunction) {
    for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
      if (JSEvents.deferredCalls[i].targetFunction == targetFunction) {
        JSEvents.deferredCalls.splice(i, 1);
        --i
      }
    }
  },
  canPerformEventHandlerRequests: function() {
    return JSEvents.inEventHandler &&
        JSEvents.currentEventHandler.allowsDeferredCalls
  },
  runDeferredCalls: function() {
    if (!JSEvents.canPerformEventHandlerRequests()) {
      return
    }
    for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
      var call = JSEvents.deferredCalls[i];
      JSEvents.deferredCalls.splice(i, 1);
      --i;
      call.targetFunction.apply(null, call.argsList)
    }
  },
  inEventHandler: 0,
  currentEventHandler: null,
  eventHandlers: [],
  removeAllHandlersOnTarget: function(target, eventTypeString) {
    for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
      if (JSEvents.eventHandlers[i].target == target &&
          (!eventTypeString ||
           eventTypeString == JSEvents.eventHandlers[i].eventTypeString)) {
        JSEvents._removeHandler(i--)
      }
    }
  },
  _removeHandler: function(i) {
    var h = JSEvents.eventHandlers[i];
    h.target.removeEventListener(
        h.eventTypeString, h.eventListenerFunc, h.useCapture);
    JSEvents.eventHandlers.splice(i, 1)
  },
  registerOrRemoveHandler: function(eventHandler) {
    var jsEventHandler = function jsEventHandler(event) {
      ++JSEvents.inEventHandler;
      JSEvents.currentEventHandler = eventHandler;
      JSEvents.runDeferredCalls();
      eventHandler.handlerFunc(event);
      JSEvents.runDeferredCalls();
      --JSEvents.inEventHandler
    };
    if (eventHandler.callbackfunc) {
      eventHandler.eventListenerFunc = jsEventHandler;
      eventHandler.target.addEventListener(
          eventHandler.eventTypeString, jsEventHandler,
          eventHandler.useCapture);
      JSEvents.eventHandlers.push(eventHandler);
      JSEvents.registerRemoveEventListeners()
    } else {
      for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
        if (JSEvents.eventHandlers[i].target == eventHandler.target &&
            JSEvents.eventHandlers[i].eventTypeString ==
                eventHandler.eventTypeString) {
          JSEvents._removeHandler(i--)
        }
      }
    }
  },
  getNodeNameForTarget: function(target) {
    if (!target) return '';
    if (target == window) return '#window';
    if (target == screen) return '#screen';
    return target && target.nodeName ? target.nodeName : ''
  },
  fullscreenEnabled: function() {
    return document.fullscreenEnabled || document.webkitFullscreenEnabled
  }
};
var __emscripten_webgl_power_preferences =
    ['default', 'low-power', 'high-performance'];
var specialHTMLTargets = [
  0, typeof document !== 'undefined' ? document : 0,
  typeof window !== 'undefined' ? window : 0
];
function __findEventTarget(target) {
  try {
    if (!target) return window;
    if (typeof target === 'number')
      target = specialHTMLTargets[target] || UTF8ToString(target);
    if (target === '#window')
      return window;
    else if (target === '#document')
      return document;
    else if (target === '#screen')
      return screen;
    else if (target === '#canvas')
      return Module['canvas'];
    return typeof target === 'string' ? document.getElementById(target) : target
  } catch (e) {
    return null
  }
}
function __findCanvasEventTarget(target) {
  if (typeof target === 'number') target = UTF8ToString(target);
  if (!target || target === '#canvas') {
    if (typeof GL !== 'undefined' && GL.offscreenCanvases['canvas'])
      return GL.offscreenCanvases['canvas'];
    return Module['canvas']
  }
  if (typeof GL !== 'undefined' && GL.offscreenCanvases[target])
    return GL.offscreenCanvases[target];
  return __findEventTarget(target)
}
function _emscripten_webgl_do_create_context(target, attributes) {
  var contextAttributes = {};
  var a = attributes >> 2;
  contextAttributes['alpha'] = !!HEAP32[a + (0 >> 2)];
  contextAttributes['depth'] = !!HEAP32[a + (4 >> 2)];
  contextAttributes['stencil'] = !!HEAP32[a + (8 >> 2)];
  contextAttributes['antialias'] = !!HEAP32[a + (12 >> 2)];
  contextAttributes['premultipliedAlpha'] = !!HEAP32[a + (16 >> 2)];
  contextAttributes['preserveDrawingBuffer'] = !!HEAP32[a + (20 >> 2)];
  var powerPreference = HEAP32[a + (24 >> 2)];
  contextAttributes['powerPreference'] =
      __emscripten_webgl_power_preferences[powerPreference];
  contextAttributes['failIfMajorPerformanceCaveat'] = !!HEAP32[a + (28 >> 2)];
  contextAttributes.majorVersion = HEAP32[a + (32 >> 2)];
  contextAttributes.minorVersion = HEAP32[a + (36 >> 2)];
  contextAttributes.enableExtensionsByDefault = HEAP32[a + (40 >> 2)];
  contextAttributes.explicitSwapControl = HEAP32[a + (44 >> 2)];
  contextAttributes.proxyContextToMainThread = HEAP32[a + (48 >> 2)];
  contextAttributes.renderViaOffscreenBackBuffer = HEAP32[a + (52 >> 2)];
  var canvas = __findCanvasEventTarget(target);
  if (!canvas) {
    return -4
  }
  if (contextAttributes.explicitSwapControl) {
    return -1
  }
  var contextHandle = GL.createContext(canvas, contextAttributes);
  return contextHandle
}
function _emscripten_webgl_create_context(a0, a1) {
  return _emscripten_webgl_do_create_context(a0, a1)
}
function _emscripten_webgl_destroy_context_calling_thread(contextHandle) {
  if (GL.currentContext == contextHandle) GL.currentContext = null;
  GL.deleteContext(contextHandle)
}
function _emscripten_webgl_destroy_context(a0) {
  return _emscripten_webgl_destroy_context_calling_thread(a0)
}
function _emscripten_webgl_make_context_current(contextHandle) {
  var success = GL.makeContextCurrent(contextHandle);
  return success ? 0 : -5
}
Module['_emscripten_webgl_make_context_current'] =
    _emscripten_webgl_make_context_current;
var PATH = {
  splitPath: function(filename) {
    var splitPathRe =
        /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    return splitPathRe.exec(filename).slice(1)
  },
  normalizeArray: function(parts, allowAboveRoot) {
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i];
      if (last === '.') {
        parts.splice(i, 1)
      } else if (last === '..') {
        parts.splice(i, 1);
        up++
      } else if (up) {
        parts.splice(i, 1);
        up--
      }
    }
    if (allowAboveRoot) {
      for (; up; up--) {
        parts.unshift('..')
      }
    }
    return parts
  },
  normalize: function(path) {
    var isAbsolute = path.charAt(0) === '/',
        trailingSlash = path.substr(-1) === '/';
    path = PATH.normalizeArray(
                   path.split('/').filter(function(p) {
                     return !!p
                   }),
                   !isAbsolute)
               .join('/');
    if (!path && !isAbsolute) {
      path = '.'
    }
    if (path && trailingSlash) {
      path += '/'
    }
    return (isAbsolute ? '/' : '') + path
  },
  dirname: function(path) {
    var result = PATH.splitPath(path), root = result[0], dir = result[1];
    if (!root && !dir) {
      return '.'
    }
    if (dir) {
      dir = dir.substr(0, dir.length - 1)
    }
    return root + dir
  },
  basename: function(path) {
    if (path === '/') return '/';
    var lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) return path;
    return path.substr(lastSlash + 1)
  },
  extname: function(path) {
    return PATH.splitPath(path)[3]
  },
  join: function() {
    var paths = Array.prototype.slice.call(arguments, 0);
    return PATH.normalize(paths.join('/'))
  },
  join2: function(l, r) {
    return PATH.normalize(l + '/' + r)
  }
};
var SYSCALLS = {
  mappings: {},
  buffers: [null, [], []],
  printChar: function(stream, curr) {
    var buffer = SYSCALLS.buffers[stream];
    if (curr === 0 || curr === 10) {
      (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
      buffer.length = 0
    } else {
      buffer.push(curr)
    }
  },
  varargs: undefined,
  get: function() {
    SYSCALLS.varargs += 4;
    var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
    return ret
  },
  getStr: function(ptr) {
    var ret = UTF8ToString(ptr);
    return ret
  },
  get64: function(low, high) {
    return low
  }
};
function _fd_write(fd, iov, iovcnt, pnum) {
  var num = 0;
  for (var i = 0; i < iovcnt; i++) {
    var ptr = HEAP32[iov + i * 8 >> 2];
    var len = HEAP32[iov + (i * 8 + 4) >> 2];
    for (var j = 0; j < len; j++) {
      SYSCALLS.printChar(fd, HEAPU8[ptr + j])
    }
    num += len
  }
  HEAP32[pnum >> 2] = num;
  return 0
}
function _glAttachShader(program, shader) {
  GLctx.attachShader(GL.programs[program], GL.shaders[shader])
}
function _glClear(x0) {
  GLctx['clear'](x0)
}
function _glClearColor(x0, x1, x2, x3) {
  GLctx['clearColor'](x0, x1, x2, x3)
}
function _glCompileShader(shader) {
  GLctx.compileShader(GL.shaders[shader])
}
function _glCreateProgram() {
  var id = GL.getNewId(GL.programs);
  var program = GLctx.createProgram();
  program.name = id;
  GL.programs[id] = program;
  return id
}
function _glCreateShader(shaderType) {
  var id = GL.getNewId(GL.shaders);
  GL.shaders[id] = GLctx.createShader(shaderType);
  return id
}
function _glDeleteProgram(id) {
  if (!id) return;
  var program = GL.programs[id];
  if (!program) {
    GL.recordError(1281);
    return
  }
  GLctx.deleteProgram(program);
  program.name = 0;
  GL.programs[id] = null;
  GL.programInfos[id] = null
}
function _glDeleteShader(id) {
  if (!id) return;
  var shader = GL.shaders[id];
  if (!shader) {
    GL.recordError(1281);
    return
  }
  GLctx.deleteShader(shader);
  GL.shaders[id] = null
}
function _glDrawArrays(mode, first, count) {
  GL.preDrawHandleClientVertexAttribBindings(first + count);
  GLctx.drawArrays(mode, first, count);
  GL.postDrawHandleClientVertexAttribBindings()
}
function _glEnableVertexAttribArray(index) {
  var cb = GL.currentContext.clientBuffers[index];
  cb.enabled = true;
  GLctx.enableVertexAttribArray(index)
}
function _glGetProgramInfoLog(program, maxLength, length, infoLog) {
  var log = GLctx.getProgramInfoLog(GL.programs[program]);
  if (log === null) log = '(unknown error)';
  var numBytesWrittenExclNull =
      maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
  if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
}
function _glGetProgramiv(program, pname, p) {
  if (!p) {
    GL.recordError(1281);
    return
  }
  if (program >= GL.counter) {
    GL.recordError(1281);
    return
  }
  var ptable = GL.programInfos[program];
  if (!ptable) {
    GL.recordError(1282);
    return
  }
  if (pname == 35716) {
    var log = GLctx.getProgramInfoLog(GL.programs[program]);
    if (log === null) log = '(unknown error)';
    HEAP32[p >> 2] = log.length + 1
  } else if (pname == 35719) {
    HEAP32[p >> 2] = ptable.maxUniformLength
  } else if (pname == 35722) {
    if (ptable.maxAttributeLength == -1) {
      program = GL.programs[program];
      var numAttribs = GLctx.getProgramParameter(program, 35721);
      ptable.maxAttributeLength = 0;
      for (var i = 0; i < numAttribs; ++i) {
        var activeAttrib = GLctx.getActiveAttrib(program, i);
        ptable.maxAttributeLength =
            Math.max(ptable.maxAttributeLength, activeAttrib.name.length + 1)
      }
    }
    HEAP32[p >> 2] = ptable.maxAttributeLength
  } else if (pname == 35381) {
    if (ptable.maxUniformBlockNameLength == -1) {
      program = GL.programs[program];
      var numBlocks = GLctx.getProgramParameter(program, 35382);
      ptable.maxUniformBlockNameLength = 0;
      for (var i = 0; i < numBlocks; ++i) {
        var activeBlockName = GLctx.getActiveUniformBlockName(program, i);
        ptable.maxUniformBlockNameLength = Math.max(
            ptable.maxUniformBlockNameLength, activeBlockName.length + 1)
      }
    }
    HEAP32[p >> 2] = ptable.maxUniformBlockNameLength
  } else {
    HEAP32[p >> 2] = GLctx.getProgramParameter(GL.programs[program], pname)
  }
}
function _glGetShaderInfoLog(shader, maxLength, length, infoLog) {
  var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
  if (log === null) log = '(unknown error)';
  var numBytesWrittenExclNull =
      maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
  if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
}
function _glGetShaderiv(shader, pname, p) {
  if (!p) {
    GL.recordError(1281);
    return
  }
  if (pname == 35716) {
    var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
    if (log === null) log = '(unknown error)';
    HEAP32[p >> 2] = log.length + 1
  } else if (pname == 35720) {
    var source = GLctx.getShaderSource(GL.shaders[shader]);
    var sourceLength =
        source === null || source.length == 0 ? 0 : source.length + 1;
    HEAP32[p >> 2] = sourceLength
  } else {
    HEAP32[p >> 2] = GLctx.getShaderParameter(GL.shaders[shader], pname)
  }
}
function _glLinkProgram(program) {
  GLctx.linkProgram(GL.programs[program]);
  GL.populateUniformTable(program)
}
function _glShaderSource(shader, count, string, length) {
  var source = GL.getSource(shader, count, string, length);
  GLctx.shaderSource(GL.shaders[shader], source)
}
function _glUseProgram(program) {
  GLctx.useProgram(GL.programs[program])
}
function _glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
  var cb = GL.currentContext.clientBuffers[index];
  if (!GL.currArrayBuffer) {
    cb.size = size;
    cb.type = type;
    cb.normalized = normalized;
    cb.stride = stride;
    cb.ptr = ptr;
    cb.clientside = true;
    cb.vertexAttribPointerAdaptor = function(
        index, size, type, normalized, stride, ptr) {
      this.vertexAttribPointer(index, size, type, normalized, stride, ptr)
    };
    return
  }
  cb.clientside = false;
  GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr)
}
function _glViewport(x0, x1, x2, x3) {
  GLctx['viewport'](x0, x1, x2, x3)
}
function readAsmConstArgs(sigPtr, buf) {
  if (!readAsmConstArgs.array) {
    readAsmConstArgs.array = []
  }
  var args = readAsmConstArgs.array;
  args.length = 0;
  var ch;
  while (ch = HEAPU8[sigPtr++]) {
    if (ch === 100 || ch === 102) {
      buf = buf + 7 & ~7;
      args.push(HEAPF64[buf >> 3]);
      buf += 8
    } else {
      buf = buf + 3 & ~3;
      args.push(HEAP32[buf >> 2]);
      buf += 4
    }
  }
  return args
}
var GLctx;
GL.init();
var asmLibraryArg = {
  'o': _abort,
  'l': _emscripten_asm_const_iii,
  'm': _emscripten_memcpy_big,
  'n': _emscripten_resize_heap,
  'w': _emscripten_webgl_create_context,
  'v': _emscripten_webgl_destroy_context,
  'a': _emscripten_webgl_make_context_current,
  'e': _fd_write,
  'c': _glAttachShader,
  'f': _glClear,
  'g': _glClearColor,
  'r': _glCompileShader,
  'i': _glCreateProgram,
  'A': _glCreateShader,
  'x': _glDeleteProgram,
  'j': _glDeleteShader,
  'p': _glDrawArrays,
  'q': _glEnableVertexAttribArray,
  'y': _glGetProgramInfoLog,
  'b': _glGetProgramiv,
  'k': _glGetShaderInfoLog,
  'd': _glGetShaderiv,
  'h': _glLinkProgram,
  'z': _glShaderSource,
  't': _glUseProgram,
  's': _glVertexAttribPointer,
  'u': _glViewport,
  'memory': wasmMemory,
  'table': wasmTable
};
var asm = createWasm();
Module['asm'] = asm;
var ___wasm_call_ctors = Module['___wasm_call_ctors'] = function() {
  return (___wasm_call_ctors = Module['___wasm_call_ctors'] =
              Module['asm']['B'])
      .apply(null, arguments)
};
var _main = Module['_main'] = function() {
  return (_main = Module['_main'] = Module['asm']['C']).apply(null, arguments)
};
var _clearContext = Module['_clearContext'] = function() {
  return (_clearContext = Module['_clearContext'] = Module['asm']['D'])
      .apply(null, arguments)
};
var _createContext = Module['_createContext'] = function() {
  return (_createContext = Module['_createContext'] = Module['asm']['E'])
      .apply(null, arguments)
};
var _setContextBackgroundColor =
    Module['_setContextBackgroundColor'] = function() {
      return (_setContextBackgroundColor =
                  Module['_setContextBackgroundColor'] = Module['asm']['F'])
          .apply(null, arguments)
    };
var _drawTriangle = Module['_drawTriangle'] = function() {
  return (_drawTriangle = Module['_drawTriangle'] = Module['asm']['G'])
      .apply(null, arguments)
};
var _malloc = Module['_malloc'] = function() {
  return (_malloc = Module['_malloc'] = Module['asm']['H'])
      .apply(null, arguments)
};
var stackSave = Module['stackSave'] = function() {
  return (stackSave = Module['stackSave'] = Module['asm']['I'])
      .apply(null, arguments)
};
var stackAlloc = Module['stackAlloc'] = function() {
  return (stackAlloc = Module['stackAlloc'] = Module['asm']['J'])
      .apply(null, arguments)
};
var stackRestore = Module['stackRestore'] = function() {
  return (stackRestore = Module['stackRestore'] = Module['asm']['K'])
      .apply(null, arguments)
};
Module['asm'] = asm;
Module['ccall'] = ccall;
var calledRun;
function ExitStatus(status) {
  this.name = 'ExitStatus';
  this.message = 'Program terminated with exit(' + status + ')';
  this.status = status
}
var calledMain = false;
dependenciesFulfilled = function runCaller() {
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller
};
function callMain(args) {
  var entryFunction = Module['_main'];
  args = args || [];
  var argc = args.length + 1;
  var argv = stackAlloc((argc + 1) * 4);
  HEAP32[argv >> 2] = allocateUTF8OnStack(thisProgram);
  for (var i = 1; i < argc; i++) {
    HEAP32[(argv >> 2) + i] = allocateUTF8OnStack(args[i - 1])
  }
  HEAP32[(argv >> 2) + argc] = 0;
  try {
    var ret = entryFunction(argc, argv);
    exit(ret, true)
  } catch (e) {
    if (e instanceof ExitStatus) {
      return
    } else if (e == 'unwind') {
      noExitRuntime = true;
      return
    } else {
      var toLog = e;
      if (e && typeof e === 'object' && e.stack) {
        toLog = [e, e.stack]
      }
      err('exception thrown: ' + toLog);
      quit_(1, e)
    }
  } finally {
    calledMain = true
  }
}
function run(args) {
  args = args || arguments_;
  if (runDependencies > 0) {
    return
  }
  preRun();
  if (runDependencies > 0) return;
  function doRun() {
    if (calledRun) return;
    calledRun = true;
    Module['calledRun'] = true;
    if (ABORT) return;
    initRuntime();
    preMain();
    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();
    if (shouldRunNow) callMain(args);
    postRun()
  }
  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('')
      }, 1);
      doRun()
    }, 1)
  } else {
    doRun()
  }
}
Module['run'] = run;
function exit(status, implicit) {
  if (implicit && noExitRuntime && status === 0) {
    return
  }
  if (noExitRuntime) {
  } else {
    ABORT = true;
    EXITSTATUS = status;
    exitRuntime();
    if (Module['onExit']) Module['onExit'](status)
  }
  quit_(status, new ExitStatus(status))
}
if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function')
    Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()()
  }
}
var shouldRunNow = true;
if (Module['noInitialRun']) shouldRunNow = false;
noExitRuntime = true;
run();
