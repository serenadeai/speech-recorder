#!/bin/bash

set -e
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pushd "$HERE" &> /dev/null

mkdir -p lib/build
cd lib/build

if [[ `uname -s` == "MINGW"* ]] ; then
  cmake -A Win32 ..
else
  cmake -DCMAKE_OSX_ARCHITECTURES=x86_64 ..
fi

cmake --build . --config Release
cd ../..

if [[ `uname -s` == "Darwin" ]] ; then
  npm_config_arch=x64 ./node_modules/.bin/node-gyp rebuild
  ./node_modules/.bin/prebuild -r napi --include-regex '.(node|a|dylib|dll|so)$' --arch=x64
else
  npm_config_arch=ia32 ./node_modules/.bin/node-gyp rebuild
  ./node_modules/.bin/prebuild -r napi --include-regex '.(node|a|dylib|dll|so)$' --arch=ia32
fi

popd &> /dev/null
