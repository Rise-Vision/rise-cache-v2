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
    let message = "ERROR: " + detail + " " + errorDetail;
    if (debugging) console.error(getLogDatetime() + " - " + message);

    fileSystem.appendToLog(getLogDatetime(), message);
    if (externalLogger) {externalLogger.log("error", detail, errorDetail);}
  };

  const info = function (detail) {
    let message = "INFO: " + detail;
    if (debugging) console.info(getLogDatetime() + " - " + message);

    fileSystem.appendToLog(getLogDatetime(), message);
    if (externalLogger) {externalLogger.log("info", detail);}
  };

  const warn = function (detail) {
    let message = "WARNING: " + detail;
    if (debugging) console.warn(getLogDatetime() + " - " + message);

    fileSystem.appendToLog(getLogDatetime(), message);
    if (externalLogger) {externalLogger.log("warning", detail);}
  };

  return {
    info: info,
    warn: warn,
    error: error
  };
};

module.exports = Logger;