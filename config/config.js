const os = require("os");
const path = require("path");
const rvplayerPath = (process.platform === "win32") ?
  path.join(process.env["LOCALAPPDATA"], "rvplayer") :
  path.join(os.homedir(), "rvplayer");
const riseCachePath = path.join(rvplayerPath, "RiseCache");

const getOS = function () {

  if (process.platform === "win32") {
    return "win" + process.arch;
  } else {
    return process.platform + process.arch;
  }

};

module.exports = {
  port: 9494,
  url: "localhost",
  cachePath: path.join(riseCachePath,"cache"),
  downloadPath: path.join(riseCachePath,"download"),
  headersDBPath: path.join(riseCachePath,"database","headers.db"),
  metadataDBPath: path.join(riseCachePath,"database","metadata.db"),
  spreadsheetsDBPath: path.join(riseCachePath, "database", "spreadsheets.db"),
  financialDBPath: path.join(riseCachePath, "database", "financial.db"),
  riseDisplayNetworkIIPath: path.join(rvplayerPath,"RiseDisplayNetworkII.ini"),
  logFilePath: path.join(riseCachePath,"risecache.log"),
  diskThreshold: 500 * 1024 * 1024,  // 500 MB
  fileUpdateDuration: 1200000, // 20 minutes,
  requestTimeout: 120000, // 2 minutes
  debugging: process.argv.slice(1).join(" ").indexOf("debug") > -1,
  os: getOS(),
  bqProjectName: "client-side-events",
  bqDataset: "Rise_Cache_V2"
};