const child_process = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const run = (command) => {
  try {
    child_process.execSync(command, { stdio: "inherit" });
  } catch (e) {
    process.exit(e.status);
  }
};

const start = process.cwd();
process.chdir(__dirname);
fs.mkdirSync("lib/build", { recursive: true });

process.chdir("lib/build");
if (process.platform == "win32") {
  run("cmake -A Win32 ..");
} else {
  run("cmake -DCMAKE_OSX_ARCHITECTURES=x86_64 ..");
}

run("cmake --build . --config Release");

process.chdir(__dirname);
run("node-gyp rebuild");

process.chdir(start);
