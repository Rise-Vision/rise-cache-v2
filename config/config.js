const os = require("os");
const path = require("path");
const rvplayerPath = (process.platform === "win32") ?
  path.join(process.env["LOCALAPPDATA"], "rvplayer") :
  path.join(os.homedir(), "rvplayer");
const riseCachePath = path.join(rvplayerPath, "RiseCache");

module.exports = {
  port: 9494,
  url: "localhost",
  riseCachePath: riseCachePath,
  cachePath: path.join(riseCachePath,"cache"),
  downloadPath: path.join(riseCachePath,"download"),
  headersDBPath: path.join(riseCachePath,"database","headers.db"),
  metadataDBPath: path.join(riseCachePath,"database","metadata.db"),
  riseDisplayNetworkIIPath: path.join(rvplayerPath,"RiseDisplayNetworkII.ini"),
  logFilePath: path.join(riseCachePath,"risecache.log"),
  shutdownFilePath: path.join(riseCachePath, "shutdown.txt"),
  diskThreshold: 500 * 1024 * 1024,  // 500 MB
  fileUpdateDuration: 1200000, // 20 minutes,
  debugging: process.argv.slice(1).join(" ").indexOf("debug") > -1,
  os: process.platform,
  bqProjectName: "client-side-events",
  bqDataset: "Rise_Cache_V2"
};