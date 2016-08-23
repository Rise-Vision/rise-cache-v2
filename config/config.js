const os = require("os");
const path = require("path");

module.exports = {
  port: 9494,
  url: "localhost",
  downloadPath: path.join(os.homedir(), "rvplayer", "RiseCache", "download")
};
