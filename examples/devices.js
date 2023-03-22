const { devices } = require("../src/index");

setInterval(() => {
    console.log(devices());
}, 5000);
