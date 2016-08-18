const os = require("os");
const path = require("path");

module.exports = {
  port: 9494,
  url: "localhost",
  downloadPath: os.homedir() + path.sep + "rvplayer" + path.sep + "RiseCache" + path.sep + "download"
};