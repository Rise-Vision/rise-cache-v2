"use strict";

const Logger = function (debugging, externalLogger, fileSystem) {

  const padLeft = function (number) {
    return (String(number).length === 1 ? "0" : "") + number;
  };

  const getLogDatetime = function () {
    var d = new Date();

    return [ d.getFullYear(),
      padLeft(d.getMonth() + 1),
      padLeft(d.getDate())].join("/") + " " +
      [ padLeft(d.getHours()),
        padLeft(d.getMinutes()),
        padLeft(d.getSeconds())].join(":");

  };

  const error = function (detail, errorDetail) {
    let logDatetime = getLogDatetime();
    let message = "ERROR: " + detail + " " + errorDetail;
    if (debugging) console.error(logDatetime + " - " + message);

    fileSystem.appendToLog(logDatetime, message);
    if (externalLogger) {externalLogger.log("error", detail, errorDetail, null, logDatetime);}
  };

  const info = function (detail) {
    let logDatetime = getLogDatetime();
    let message = "INFO: " + detail;
    if (debugging) console.info(logDatetime + " - " + message);

    fileSystem.appendToLog(logDatetime, message);
    if (externalLogger) {externalLogger.log("info", detail, null, logDatetime);}
  };

  const warn = function (detail) {
    let logDatetime = getLogDatetime();
    let message = "WARNING: " + detail;
    if (debugging) console.warn(logDatetime + " - " + message);

    fileSystem.appendToLog(logDatetime, message);
    if (externalLogger) {externalLogger.log("warning", detail, null, logDatetime);}
  };

  return {
    info: info,
    warn: warn,
    error: error
  };
};

module.exports = Logger;