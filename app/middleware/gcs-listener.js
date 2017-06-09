"use strict";

const { URL } = require("url");
const Messaging = require("./messaging");
const Data = require("../models/data");
const  fileSystem = require("../helpers/file-system");

const GcsListenerFactory = function(displayId, machineId, gcsMessagingUrl, metadataDB, logger) {
  const messaging = new Messaging(displayId, machineId, gcsMessagingUrl, logger);
  const metadata = new Data({}, metadataDB);
  const registeredPaths = {};
  const self = this;

  this.start = function() {
    messaging.onEvent("connected", function() {
      // If the connection was lost, register again with server
      Object.keys(registeredPaths).forEach(function(path) {
        self.sendRegistrationMessage(path);
      });
    });

    messaging.on("gcs", function(message) {
      if(message.msg == "gcs") {
        self.removeMetadata(registeredPaths[message.resource]);
      }
    });

    messaging.init();
  };

  this.registerPath = function(metadataUrl) {
    let parsed = new URL(metadataUrl);
    let searchParams = parsed.searchParams;
    let companyId = searchParams.get("companyId");
    let path = searchParams.get("file") || searchParams.get("folder") || "";
    let registeredPath = companyId + "/" + path;
    let metadataFileName = fileSystem.getFileName(metadataUrl);

    if(!registeredPaths[registeredPath]) {
      registeredPaths[registeredPath] = metadataFileName;

      this.sendRegistrationMessage(registeredPath);
    }
  };

  this.sendRegistrationMessage = function(registeredPath) {
    let companyId = registeredPath.substr(0, registeredPath.indexOf("/"));
    let path = registeredPath.replace(companyId + "/", "");

    messaging.write({
      msg: "registerPath",
      id: displayId,
      companyId: companyId,
      path: path
    });
  };

  /* Remove metadata from DB. */
  this.removeMetadata = function(path) {
    metadata.set("key", path);
    metadata.set("metadata", null);

    metadata.save((err, newMetadata) => {
      if (err) {
        logger.info("Error removing metadata", err);
      }
    });
  };
};

module.exports = GcsListenerFactory;
