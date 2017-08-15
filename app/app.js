"use strict";

const config = require("../config/config"),
  cors = require("cors"),
  pkg = require("../package.json"),
  Database = require("./database"),
  PropertiesReader = require("properties-reader"),
  CleanupJob = require("./jobs/cleanup"),
  fileSystem = require("./helpers/file-system");


const AppFactory = function() {

  let server, error, headers;

  const start = function() {

    global.DOWNLOAD_TOTAL_SIZE = 0;
    global.PROCESSING_LIST = new Set();

    fileSystem.fileExists(config.riseDisplayNetworkIIPath, (exists) => {

      let riseDisplayNetworkII = null;

      if (exists) {
        riseDisplayNetworkII = PropertiesReader(config.riseDisplayNetworkIIPath);
      }

      const displayId = (riseDisplayNetworkII) ? riseDisplayNetworkII.get("displayid") : null;
      const logger = require("./helpers/logger/logger")(config.debugging, fileSystem, displayId, pkg.version, config.os);

      process.on("uncaughtException", (err) => {
        logger.error("Uncaught exception", err.message);
      });

      if (!exists) {
        logger.warn("RiseDisplayNetworkIIPath.ini file not found");
      }

      fileSystem.cleanupDownloadFolder();
      fileSystem.cleanupLogFile(logger);
      fileSystem.createDir(config.downloadPath);
      fileSystem.createDir(config.cachePath);

      const headerDB = new Database(config.headersDBPath);
      const metadataDB = new Database(config.metadataDBPath);
      const spreadsheetDB = new Database(config.spreadsheetsDBPath);
      const rssDB = new Database(config.rssDBPath);
      const financialDB = new Database(config.financialDBPath);
      const cleanupJob = new CleanupJob(config, headerDB.db, metadataDB.db, financialDB.db, spreadsheetDB.db, rssDB.db, logger);

      server = require("./server")(config, logger);

      server.app.use(cors());

      fileSystem.fileExists(config.cachePath, (exists) => {
        if (exists) {
          cleanupJob.run(()=>{

          });
        }
      });

      server.start();

      headers = require("./middleware/headers")();
      server.app.use(headers.setHeaders);

      require("./routes/ping")(server.app, pkg);
      require("./routes/display")(server.app, displayId);
      require("./routes/file")(server.app, headerDB.db, riseDisplayNetworkII, config, logger);
      require("./routes/metadata")(server.app, metadataDB.db, riseDisplayNetworkII, logger);
      require("./routes/spreadsheets")(server.app, spreadsheetDB.db, logger);
      require("./routes/rss")(server.app, rssDB.db, logger);
      require("./routes/financial")(server.app, financialDB.db, logger);

      error = require("./middleware/error")(logger);
      server.app.use(error.handleError);

    });
  };

  const stop = (cbHttp, cbHttps) => {
    server.stop(cbHttp, cbHttps);
  };

  return {
    start: start,
    stop: stop
  };
};

module.exports = AppFactory;
