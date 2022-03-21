#!/bin/bash

set -e
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pushd "$HERE" &> /dev/null

if [[ -z "$1" ]] ; then
  echo "Usage: build.sh x86|x64|arm64 [github-token]"
  exit 1
fi

rm -rf lib/build lib/install
mkdir -p lib/build
cd lib/build

if [[ `uname -s` == "MINGW"* ]] ; then
  if [[ "$1" == "x86" ]] ; then
    cmake -A Win32 ..
  elif [[ "$1" == "x64" ]] ; then
    cmake -A x64 ..
  fi
elif [[ `uname -s` == "Darwin" ]] ; then
  if [[ "$1" == "x64" ]] ; then
    cmake -DCMAKE_OSX_ARCHITECTURES=x86_64 ..
  elif [[ "$1" == "arm64" ]] ; then
    cmake -DCMAKE_OSX_ARCHITECTURES=arm64 ..
  fi
else
  cmake ..
fi

cmake --build . --config Release
cmake --install . --prefix ../install

cd ../..
rm -rf prebuilds

node_arch="$1"
if [[ "$1" == "x86" ]] ; then
  node_arch="ia32"
fi

eval "npm_config_arch=$node_arch ./node_modules/.bin/node-gyp rebuild"

prebuild_command="./node_modules/.bin/prebuild -r napi --include-regex '.(node|a|dylib|dll|so.*)$' --arch=$node_arch"
if [[ -n "$2" ]] ; then
  prebuild_command+=" --upload $2"
fi
eval $prebuild_command

popd &> /dev/null
