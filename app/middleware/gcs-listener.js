"use strict";

const { URL } = require("url");
const Messaging = require("./messaging");
const Data = require("../models/data");
const fileSystem = require("../helpers/file-system");

const GcsListenerFactory = function(displayId, machineId, gcsMessagingUrl, metadataDB, logger) {
  const messaging = new Messaging(displayId, machineId, gcsMessagingUrl, logger);
  const metadata = new Data({}, metadataDB);
  const registeredPaths = {};
  const self = this;

  this.start = function() {
    self.invalidateMetadata();

    messaging.onEvent("connected", function() {
      // If the connection was lost, register again with server
      Object.keys(registeredPaths).forEach(function(path) {
        self.sendRegistrationMessage(path);
      });
    });

    messaging.on("gcs", function(message) {
      if(message.msg == "gcs") {
        self.invalidateResourceMetadata(registeredPaths[message.resource]);

        if(["uploaded", "deleted", "permissionsUpdated"].indexOf(message.eventType) >= 0) {
          fileSystem.deleteFromCache(message.selfLink + "?alt=media", (err)=>{
            if(err) {
              logger.error("Error deleting file from cache", err);
            }
          });
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
  this.invalidateMetadata = function(path) {
    metadata.updateBy({}, { "latest": false }, (err, numAffected) => {
      if (err) {
        logger.error("Error removing metadata", err);
      }
    });
  };

  /* Reset "latest" field for the given document */
  this.invalidateResourceMetadata = function(path) {
    metadata.set("key", path);
    metadata.update({ "latest": false }, (err, numAffected) => {
      if (err) {
        logger.error("Error updating metadata", err);
      }
    });
  };
};

module.exports = GcsListenerFactory;
