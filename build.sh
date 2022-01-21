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

rm -rf prebuilds
if [[ `uname -s` == "Darwin" ]] ; then
  npm_config_arch=x64 ./node_modules/.bin/node-gyp rebuild
  if [[ -n "$1" ]] ; then
    ./node_modules/.bin/prebuild -r napi --include-regex '.(node|a|dylib|dll|so)$' --arch=x64 --upload $1
  else
    ./node_modules/.bin/prebuild -r napi --include-regex '.(node|a|dylib|dll|so)$' --arch=x64
  fi
else
  npm_config_arch=ia32 ./node_modules/.bin/node-gyp rebuild
  if [[ -n "$1" ]] ; then
    ./node_modules/.bin/prebuild -r napi --include-regex '.(node|a|dylib|dll|so)$' --arch=ia32 --upload $1
  else
    ./node_modules/.bin/prebuild -r napi --include-regex '.(node|a|dylib|dll|so)$' --arch=ia32
  fi
fi

popd &> /dev/null
