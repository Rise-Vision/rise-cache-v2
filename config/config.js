import os from "os";
import path from "path";

let config = {};

config.downloadPath = os.homedir() + path.sep + "rvplayer" + path.sep + "RiseCache" + path.sep + "download";

export default config;