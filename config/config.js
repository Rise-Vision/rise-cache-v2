const os = require("os");
const path = require("path");
const riseCachePath = path.join(os.homedir(), "rvplayer", "RiseCache");

module.exports = {
  port: 9494,
  url: "localhost",
  cachePath: path.join(riseCachePath,"cache"),
  downloadPath: path.join(riseCachePath,"download"),
  headersDBPath: path.join(riseCachePath,"database","headers.db"),
  fileUpdateDuration: 1200000 // 20 minutes
};