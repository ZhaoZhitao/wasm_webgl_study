# wasm_webgl_study
Just for study.
## hello compile command:
emcc -o ./dist/hello.js ./hello/hello.cpp -O3 -s ALLOW_MEMORY_GROWTH=1 -s USE_WEBGL2=1 -s FULL_ES3=1 -s WASM=1 -s NO_EXIT_RUNTIME=1 -std=c++1z -s "EXTRA_EXPORTED_RUNTIME_METHODS=['ccall']" -s EXPORTED_FUNCTIONS="['_main', '_malloc', 'stringToUTF8']" -s DISABLE_DEPRECATED_FIND_EVENT_TARGET_BEHAVIOR=0
