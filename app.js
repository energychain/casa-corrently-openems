const CasaCorrently = require("casa-corrently");
const fs = require("fs");
let doupdates = true;

const fileExists = async path => !!(await fs.promises.stat(path).catch(e => false));

const boot = async function() {
  let config = {};
  if(typeof process.env.PORT !== 'undefined') {
    port = process.env.PORT;
  }
  // UUID Persistence
  if((process.argv.length == 3)&&(await fileExists(process.argv[2]))) {
    config = JSON.parse(fs.readFileSync(process.argv[2]));
  } else
  if((process.argv.length == 3)&&(await fileExists('/casa-corrently-docker'))) {
    // for use with docker image mount point of volume at /configs
    config = JSON.parse(fs.readFileSync('/casa-corrently-docker'));
  } else
  if(await fileExists("./config.json")) {
    config = JSON.parse(fs.readFileSync("./config.json"));
  } else
  if(await fileExists("./sample_config.json")) {
    config = JSON.parse(fs.readFileSync("./sample_config.json"));
  }
  if(typeof config.uuid == 'undefined') {
    config.uuid = Math.random(); // Due to node js incompatibility with nanoid or uuid this is a bad fix
    config.uuid = (""+config.uuid).substring(2) + (Math.random());
  }
  const main = await CasaCorrently();
  if(await fileExists("./node_modules/casa-corrently/public/")) {
    config.staticFiles = './node_modules/casa-corrently/public/';
  }
  if(await fileExists(__dirname + "/node_modules/casa-corrently-openems/index.js")) {
    config.source = __dirname + "/node_modules/casa-corrently-openems/index.js";
  } else {
    config.source = __dirname + '/index.js';
  }
  if(typeof config.autoupdate !== 'undefined') {
    doupdates = config.autoupdate;
  }
  await main.server(config);

  if(doupdates) {
    setInterval(function() {
      console.log("Daily Restart to update modules");
      process.exit(1);
    },86400000);
  }

};

boot();
