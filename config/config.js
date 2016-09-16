const os = require("os");
const path = require("path");
const rvplayerPath = (process.platform === "win32") ?
  path.join(process.env["LOCALAPPDATA"], "rvplayer") :
  path.join(os.homedir(), "rvplayer");
const riseCachePath = path.join(rvplayerPath, "RiseCache");

module.exports = {
  port: 9494,
  url: "localhost",
  cachePath: path.join(riseCachePath,"cache"),
  downloadPath: path.join(riseCachePath,"download"),
  headersDBPath: path.join(riseCachePath,"database","headers.db"),
  metadataDBPath: path.join(riseCachePath,"database","metadata.db"),
  riseDisplayNetworkIIPath: path.join(rvplayerPath,"RiseDisplayNetworkII.ini"),
  fileUpdateDuration: 1200000 // 20 minutes
};