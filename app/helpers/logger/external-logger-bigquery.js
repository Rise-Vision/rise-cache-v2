/*global Promise:true*/

"use strict";

const ExternalLoggerBigQuery = function (bqClient, displayId, cacheVersion, os) {

  const getDateForTableName = function (nowDate) {
    let year = nowDate.getUTCFullYear(),
      month = nowDate.getUTCMonth() + 1,
      day = nowDate.getUTCDate();

    if (month < 10) {month = "0" + month;}
    if (day < 10) {day = "0" + day;}

    return "" + year + month + day;
  };

  const log = function (eventName, eventDetails, errorDetails, nowDate) {
    if (!eventName) {return Promise.reject("eventName is required");}
    if (!nowDate || !Date.prototype.isPrototypeOf(nowDate)) {
      nowDate = new Date();
    }

    let data = {
      event: eventName,
      event_details: eventDetails || "",
      error_details: errorDetails  || "",
      display_id: displayId || "no-displayId",
      cache_version: cacheVersion || "no-risecache",
      os: os,
      ts: nowDate.toISOString()
    };

    return bqClient.insert("events", data, nowDate, getDateForTableName(nowDate))
      .catch((e)=>{
        log.file("Could not log to bq " + require("util").inspect(e, { depth: null }));
      });
  };

  return {
    getDateForTableName: getDateForTableName,
    log: log
  };
};

module.exports = ExternalLoggerBigQuery;