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

  const getMessage = function (type, detail, fileUrl = "", fileName = fileSystem.getFileName(fileUrl)) {
    return (fileUrl) ? `${type}: ${detail} ${fileUrl} ${fileName}` : `${type}: ${detail}`;
  };

  const error = function (detail, errorDetail, fileUrl, fileName) {
    let logDatetime = getLogDatetime();
    let message = getMessage("ERROR", `${detail} ${errorDetail}`, fileUrl, fileName);
    if (debugging) console.error(`${logDatetime} - ${message}`);

    fileSystem.appendToLog(logDatetime, message);
    if (externalLogger) {externalLogger.log("error", detail, fileUrl, fileName, errorDetail, null, logDatetime);}
  };

  const info = function (detail, fileUrl, fileName) {
    let logDatetime = getLogDatetime();
    let message = getMessage("INFO", detail, fileUrl, fileName);
    if (debugging) console.info(`${logDatetime} - ${message}`);

    fileSystem.appendToLog(logDatetime, message);
    if (externalLogger) {externalLogger.log("info", detail, fileUrl, fileName, null, logDatetime);}
  };

  const warn = function (detail, fileUrl, fileName) {
    let logDatetime = getLogDatetime();
    let message = getMessage("WARNING", detail, fileUrl, fileName);
    if (debugging) console.warn(`${logDatetime} - ${message}`);

    fileSystem.appendToLog(logDatetime, message);
    if (externalLogger) {externalLogger.log("warning", detail, fileUrl, fileName, null, logDatetime);}
  };

  return {
    info: info,
    warn: warn,
    error: error
  };
};

module.exports = Logger;