"use strict";

const Logger = function (debugging, fileSystem, displayId, cacheVersion, os) {

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

  const logToPlayer = function(eventName, eventDetails, fileUrl = "", fileName = fileSystem.getFileName(fileUrl), errorDetails) {
    // process.send will be available if IPC channel established from Player
    if (!process.send) {return;}
    if (!eventName) {return;}

    let data = {
      event: eventName,
      event_details: eventDetails || "",
      error_details: errorDetails  || "",
      display_id: displayId || "no-displayId",
      cache_version: cacheVersion || "no-risecache",
      os: os,
      file_name: fileName,
      file_url: fileUrl
    };

    process.send(data);
  };

  const error = function (detail, errorDetail, fileUrl, fileName) {
    if (typeof detail === "object") { detail = JSON.stringify(detail); }
    if (typeof errorDetail === "object") { errorDetail = JSON.stringify(errorDetail); }

    let logDatetime = getLogDatetime();
    let message = getMessage("ERROR", `${detail} ${errorDetail}`, fileUrl, fileName);
    if (debugging) console.error(`${logDatetime} - ${message}`);

    fileSystem.appendToLog(logDatetime, message);
    logToPlayer("error", detail, fileUrl, fileName, errorDetail);
  };

  const info = function (detail, fileUrl, fileName) {
    if (typeof detail === "object") { detail = JSON.stringify(detail); }

    let logDatetime = getLogDatetime();
    let message = getMessage("INFO", detail, fileUrl, fileName);
    if (debugging) console.info(`${logDatetime} - ${message}`);

    fileSystem.appendToLog(logDatetime, message);
    logToPlayer("info", detail, fileUrl, fileName);
  };

  const warn = function (detail, fileUrl, fileName) {
    if (typeof detail === "object") { detail = JSON.stringify(detail); }

    let logDatetime = getLogDatetime();
    let message = getMessage("WARNING", detail, fileUrl, fileName);
    if (debugging) console.warn(`${logDatetime} - ${message}`);

    fileSystem.appendToLog(logDatetime, message);
    logToPlayer("warning", detail, fileUrl, fileName);
  };

  return {
    info: info,
    warn: warn,
    error: error
  };
};

module.exports = Logger;