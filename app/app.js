"use strict";

const config = require("../config/config"),
  cors = require("cors"),
  error = require("./middleware/error"),
  pkg = require("../package.json"),
  Database = require("./database"),
  PropertiesReader = require("properties-reader"),
  CleanupJob = require("./jobs/cleanup"),
  fileSystem = require("./helpers/file-system");


const AppFactory = function() {

  let server;

  const start = function() {

    fileSystem.fileExists(config.riseDisplayNetworkIIPath, (exists) => {

      let riseDisplayNetworkII = null;

      if (exists) {
        riseDisplayNetworkII = PropertiesReader(config.riseDisplayNetworkIIPath);
      } else {
        console.warn("RiseDisplayNetworkIIPath.ini file not found.");
      }

      let displayId = (riseDisplayNetworkII) ? riseDisplayNetworkII.get("displayid") : null;
      var bqClient = require("rise-common-electron").bqClient(config.bqProjectName, config.bqDataset);
      const externalLogger = require("./helpers/logger/external-logger-bigquery")(bqClient, displayId, pkg.version, config.os);
      const logger = require("./helpers/logger/logger")(config.debugging, externalLogger, fileSystem);

      fileSystem.cleanupLogFile();

      fileSystem.createDir(config.downloadPath);
      fileSystem.createDir(config.cachePath);

      const headerDB = new Database(config.headersDBPath);
      const metadataDB = new Database(config.metadataDBPath);
      const spreadsheetDB = new Database(config.spreadsheetDataDBPath);
      const cleanupJob = new CleanupJob(config, headerDB.db, metadataDB.db, logger);

      server = require("./server")(config, logger);

      server.app.use(cors());

      fileSystem.fileExists(config.cachePath, (exists) => {
        if (exists) {
          cleanupJob.run();
        }
      });

      server.start();

      require("./routes/ping")(server.app, pkg);
      require("./routes/display")(server.app, displayId);
      require("./routes/file")(server.app, headerDB.db, riseDisplayNetworkII, config, logger);
      require("./routes/metadata")(server.app, metadataDB.db, riseDisplayNetworkII);
      require("./routes/spreadsheets")(server.app, spreadsheetDB.db);

      server.app.use(error.handleError);

    });
  };

  const stop = function() {
    server.stop();
  };

  return {
    start: start,
    stop: stop
  };
};

module.exports = AppFactory;