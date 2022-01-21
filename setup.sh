#!/bin/bash

set -e
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pushd "$HERE" &> /dev/null

rm -rf tmp lib/3rd_party/portaudio lib/3rd_party/onnxruntime lib/3rd_party/vcruntime

mkdir -p tmp/portaudio
cd tmp/portaudio
curl -Lo portaudio.tgz http://files.portaudio.com/archives/pa_stable_v190700_20210406.tgz
tar xvf portaudio.tgz

cd portaudio
mkdir dist install
cd dist
if [[ `uname -s` == "MINGW"* ]] ; then
  cmake \
    -DCMAKE_INSTALL_PREFIX=../install \
    -A Win32 \
    ..
else
  cmake \
    -DCMAKE_INSTALL_PREFIX=../install \
    -DCMAKE_OSX_ARCHITECTURES=x86_64 \
    -DCMAKE_OSX_DEPLOYMENT_TARGET=10.14 \
    ..
fi

cmake --build . --config Release
cmake --install .
cp -r ../install ../../../../lib/3rd_party/portaudio

cd ../../..
mkdir onnxruntime
cd onnxruntime

if [[ `uname -s` == "MINGW"* ]] ; then
  mkdir -p ../../lib/3rd_party/onnxruntime/lib
  curl -Lo onnxruntime.zip https://www.nuget.org/api/v2/package/Microsoft.ML.OnnxRuntime/1.10.0
  unzip onnxruntime.zip
  cp -r build/native/include ../../lib/3rd_party/onnxruntime
  cp runtimes/win-x86/native/*.dll ../../lib/3rd_party/onnxruntime/lib
  cp runtimes/win-x86/native/*.lib ../../lib/3rd_party/onnxruntime/lib
elif [[ `uname -s` == "Darwin" ]] ; then
  curl -Lo onnxruntime.tgz https://github.com/microsoft/onnxruntime/releases/download/v1.10.0/onnxruntime-osx-x86_64-1.10.0.tgz
  tar xvf onnxruntime.tgz
  cp -r onnxruntime-osx-x86_64-1.10.0 ../../lib/3rd_party/onnxruntime
else
  curl -Lo onnxruntime.tgz https://github.com/microsoft/onnxruntime/releases/download/v1.10.0/onnxruntime-linux-x64-1.10.0.tgz
  tar xvf onnxruntime.tgz
  cp -r onnxruntime-linux-x64-1.10.0 ../../lib/3rd_party/onnxruntime
fi

cd ../..
if [[ `uname -s` == "MINGW"* ]] ; then
  mkdir -p lib/3rd_party/vcruntime
  cp /c/Windows/System32/vcruntime140.dll lib/3rd_party/vcruntime
fi

rm -rf tmp
popd &> /dev/null