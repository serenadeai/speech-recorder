const child_process = require("child_process");
const path = require("path");

const run = (command) => {
  try {
    child_process.execSync(command, { stdio: "inherit" });
  } catch (e) {
    process.exit(e.status);
  }
};

const cwd = process.cwd();
process.chdir(__dirname);
run("rm -rf tmp lib/3rd_party/portaudio lib/3rd_party/onnxruntime lib/3rd_party/vcruntime");

run("mkdir -p tmp/portaudio");
process.chdir("tmp/portaudio");
run("wget http://files.portaudio.com/archives/pa_stable_v190700_20210406.tgz");
run("tar xvf pa_stable_v190700_20210406.tgz");

process.chdir("portaudio");
run("mkdir dist install");
process.chdir("dist");
if (process.platform == "win32") {
  run("cmake -DCMAKE_INSTALL_PREFIX=../install -A Win32 ..");
} else {
  run(
    "cmake -DCMAKE_INSTALL_PREFIX=../install -DCMAKE_OSX_ARCHITECTURES=x86_64 -DCMAKE_OSX_DEPLOYMENT_TARGET=10.14 .."
  );
}

run("cmake --build . --config Release");
run("cmake --install .");
run("cp -r ../install ../../../../lib/3rd_party/portaudio");

process.chdir(path.join(__dirname, "tmp"));
run("mkdir onnxruntime");
process.chdir("onnxruntime");

if (process.platform == "win32") {
  run("mkdir -p ../../lib/3rd_party/onnxruntime/lib");
  run(
    "wget -O onnxruntime.zip https://www.nuget.org/api/v2/package/Microsoft.ML.OnnxRuntime/1.10.0"
  );
  run("unzip onnxruntime.zip");
  run("cp -r build/native/include ../../lib/3rd_party/onnxruntime");
  run("cp runtimes/win-x86/native/*.dll ../../lib/3rd_party/onnxruntime/lib");
  run("cp runtimes/win-x86/native/*.lib ../../lib/3rd_party/onnxruntime/lib");
} else if (process.platform == "darwin") {
  run(
    "wget https://github.com/microsoft/onnxruntime/releases/download/v1.10.0/onnxruntime-osx-x86_64-1.10.0.tgz"
  );
  run("tar xvf onnxruntime-osx-x86_64-1.10.0.tgz");
  run("cp -r onnxruntime-osx-x86_64-1.10.0 ../../lib/3rd_party/onnxruntime");
  run("rm -rf lib/3rd_party/onnxruntime/lib/libonnxruntime.1.10.0.dylib.dSYM");
} else {
  run(
    "wget https://github.com/microsoft/onnxruntime/releases/download/v1.10.0/onnxruntime-linux-x64-1.10.0.tgz"
  );
  run("tar xvf onnxruntime-linux-x64-1.10.0.tgz");
  run("cp -r onnxruntime-linux-x64-1.10.0 ../../lib/3rd_party/onnxruntime");
}

process.chdir(__dirname);
if (process.platform == "win32") {
  run("mkdir -p lib/3rd_party/vcruntime");
  run("cp /c/Windows/System32/vcruntime140.dll lib/3rd_party/vcruntime");
}

run("rm -rf tmp");
process.chdir(cwd);
