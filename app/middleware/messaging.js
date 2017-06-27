"use strict";

const Primus = require("primus");
const Socket = Primus.createSocket({transformer: "websockets"});
const network = require("rise-common-electron").network;

const MessagingFactory = function(displayId, machineId, messagingUrl, logger) {
  const self = this;

  let handlers = [];
  let eventHandlers = {};
  let connection;

  this.init = function() {
    let serverUrl = (messagingUrl || "https://storage-notifier.risevision.com") + "?displayId=" + displayId + "&machineId=" + machineId;

    self.disconnect();

    logger.info("messaging connecting to " + serverUrl + " via " + JSON.stringify(network.getProxyAgents()));
    connection = new Socket(serverUrl, {
      transport: {
        agent: network.getProxyAgents().httpsAgent
      },
      reconnect: {
        max: 1800000,
        min: 5000,
        retries: Infinity
      }
    });

    connection.on("open", ()=>{
      logger.info("messaging service connected");
      if(eventHandlers.connected) {
        eventHandlers.connected();
      }
    });

    connection.on("close", ()=>{
      logger.info("messaging service connection closed");
      if(eventHandlers.disconnected) {
        eventHandlers.disconnected();
      }
    });

    connection.on("end", ()=>{
      logger.info("messaging service disconnected");
      if(eventHandlers.disconnected) {
        eventHandlers.disconnected();
      }
    });

    connection.on("data", (data)=>{
      //logger.info("message received", JSON.stringify(data));
      handlers.forEach((handler)=>{
        handler(data);
      });
    });

    connection.on("error", (error)=>{
      logger.error("messaging error", error.stack);
    });
  };

  // Connection related events only
  this.onEvent = function(event, action) {
    eventHandlers[event] = action;
  };

  // Message events (application related)
  this.on = function(message, action) {
    handlers.push((data)=>{
      if (data.msg === message) {action(data);}
    });
  };

  this.write = function(message) {
    return connection.write(message);
  };

  this.disconnect = function() {
    if (connection) {connection.end();}
  };

  this.injectMessage = function(data) {
    handlers.forEach((handler)=>{
      handler(data);
    });
  };
};

module.exports = MessagingFactory;
