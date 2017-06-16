"use strict";

const { URL } = require("url");
const Messaging = require("./messaging");
const Data = require("../models/data");
const fileSystem = require("../helpers/file-system");

const GcsListenerFactory = function(displayId, machineId, gcsMessagingUrl, metadataDB, headerDB, logger) {
  const messaging = new Messaging(displayId, machineId, gcsMessagingUrl, logger);
  const metadata = new Data({}, metadataDB);
  const header = new Data({}, headerDB);
  const registeredPaths = {};
  const self = this;

  this.start = function() {
    self.invalidateAllMetadata();
    self.invalidateAllHeaders();

    messaging.onEvent("connected", function() {
      // If the connection was lost, register again with server
      Object.keys(registeredPaths).forEach(function(path) {
        self.sendRegistrationMessage(path);
      });
    });

    messaging.on("gcs", function(message) {
      if(message.msg === "gcs") {
        logger.info("Received update for: " + message.resource);
        self.invalidateMetadata(registeredPaths[message.resource]);

        if(["uploaded", "deleted", "permissionsUpdated"].indexOf(message.eventType) >= 0) {
          self.invalidateHeader(message.selfLink);
        }
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

  // Reset "latest" field for all metadata documents
  this.invalidateAllMetadata = function(path) {
    metadata.updateBy({}, { "latest": false }, (err, numAffected) => {
      if (err) {
        logger.error("Error invalidating all existing metadata", err);
      }
    });
  };

  /* Reset "latest" field for the given metadata document */
  this.invalidateMetadata = function(path) {
    metadata.set("key", path);
    metadata.update({ "latest": false }, (err, numAffected) => {
      if (err) {
        logger.error("Error invalidating metadata", err);
      }
    });
  };

  // Reset "latest" field for all header documents
  this.invalidateAllHeaders = function(path) {
    header.updateBy({}, { "latest": false }, (err, numAffected) => {
      if (err) {
        logger.error("Error invalidating all existing headers", err);
      }
    });
  };

  /* Reset "latest" field for the given header document */
  this.invalidateHeader = function(path) {
    let mediaPath = path.replace("https://www.googleapis.com/storage/v1/b/", "https://storage.googleapis.com/")
                        .replace("/o/", "/");
    let fileName = fileSystem.getFileName(mediaPath);
    
    logger.info("Invalidating: " + fileName + " for url: " + path + " mediaPath: " + mediaPath);

    header.set("key", fileName);
    header.update({ "latest": false }, (err, numAffected) => {
      if (err) {
        logger.error("Error invalidating header", err);
      }
    });
  };
};

module.exports = GcsListenerFactory;
