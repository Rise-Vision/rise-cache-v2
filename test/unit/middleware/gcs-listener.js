"use strict";

const fs = require("fs"),
  chai = require("chai"),
  sinon = require("sinon"),
  GcsListenerFactory = require("../../../app/middleware/gcs-listener"),
  fileSystem = require("../../../app/helpers/file-system"),
  expect = chai.expect;

describe("GCS Listener", () => {
  const companyId = "30007b45-3df0-4c7b-9f7f-7d8ce6443013";
  const metadataUrlBase = `https://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=${companyId}`;

  let sandbox = null;
  let metadataDB, headerDB;
  let messaging, gcsListener, logger;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers();

    metadataDB = {
      find: sandbox.stub(),
      update: sandbox.stub(),
      remove: sandbox.stub()
    };

    headerDB = {
      find: sandbox.stub(),
      update: sandbox.stub(),
      remove: sandbox.stub()
    };
    
    messaging = {
      init: sandbox.stub(),
      onEvent: sandbox.stub(),
      on: sandbox.stub(),
      write: sandbox.stub(),
      disconnect: sandbox.stub()
    };

    logger = {
      info: sandbox.stub(),
      error: sandbox.stub(),
      warn: sandbox.stub()
    };

    gcsListener = new GcsListenerFactory("displayId", messaging, metadataDB, headerDB, logger);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should initialize the socket connection and invalidate existing metadata/headers", () => {
    sandbox.spy(gcsListener, "invalidateAllMetadata");
    sandbox.spy(gcsListener, "invalidateAllHeaders");

    gcsListener.start();
    expect(messaging.init).to.be.called;
    expect(gcsListener.invalidateAllMetadata).to.be.called;
    expect(gcsListener.invalidateAllHeaders).to.be.called;
  });

  it("should initialize the socket connection and invalidate existing metadata/headers", () => {
    sandbox.spy(gcsListener, "registerPath");

    gcsListener.registerPath(metadataUrlBase + "&file=test.jpg");
    gcsListener.registerPath(metadataUrlBase + "&folder=images/sub1/");

    gcsListener.start();

    expect(messaging.write.callCount).to.equal(2);
    expect(messaging.write.getCall(0).args[0].path).to.equal("test.jpg");
    expect(messaging.write.getCall(1).args[0].path).to.equal("images/sub1/");

    // Test that path registration is sent again when the "connected" event is received
    expect(messaging.onEvent.getCall(0).args[0]).to.equal("connected");
    messaging.onEvent.getCall(0).args[1]();
    expect(messaging.write.callCount).to.equal(4);
  });

  it("should correctly invalidate metadata based on the last-message-time message", () => {
    sandbox.spy(gcsListener, "invalidateAllMetadata");
    sandbox.spy(gcsListener, "invalidateAllHeaders");

    gcsListener.start();

    expect(gcsListener.invalidateAllMetadata.callCount).to.equal(1);
    expect(gcsListener.invalidateAllHeaders.callCount).to.equal(1);

    expect(messaging.on.getCall(0).args[0]).to.equal("last-message-time");
    messaging.on.getCall(0).args[1]({
      displayId: "displayId",
      lastMessageTime: 1
    });

    expect(gcsListener.invalidateAllMetadata.callCount).to.equal(2);
    expect(gcsListener.invalidateAllHeaders.callCount).to.equal(2);

    messaging.on.getCall(0).args[1]({
      displayId: "displayId",
      lastMessageTime: 1
    });

    expect(gcsListener.invalidateAllMetadata.callCount).to.equal(2);
    expect(gcsListener.invalidateAllHeaders.callCount).to.equal(2);

    messaging.on.getCall(0).args[1]({
      displayId: "displayId",
      lastMessageTime: 2
    });

    expect(gcsListener.invalidateAllMetadata.callCount).to.equal(3);
    expect(gcsListener.invalidateAllHeaders.callCount).to.equal(3);
  });


  it("should correctly handle gcs-update messages", () => {
    sandbox.spy(gcsListener, "invalidateMetadata");
    sandbox.spy(gcsListener, "invalidateHeader");

    gcsListener.registerPath(metadataUrlBase + "&file=test.jpg");

    gcsListener.start();

    // Reset to make the intention clearer (Data.updateBy also calls db.update)
    metadataDB.update.reset();
    headerDB.update.reset();

    expect(messaging.on.getCall(1).args[0]).to.equal("gcs-update");
    messaging.on.getCall(1).args[1]({
      resource: companyId + "/test.jpg",
      eventType: "uploaded",
      selfLink: `https://www.googleapis.com/storage/v1/b/risemedialibrary-${companyId}/o/test.jpg`,
      ts: 1
    });
    
    expect(gcsListener.invalidateMetadata.callCount).to.equal(1);
    expect(gcsListener.invalidateHeader.callCount).to.equal(1);
    expect(gcsListener.invalidateMetadata.getCall(0).args[0]).to.equal(fileSystem.getFileName(metadataUrlBase + "&file=test.jpg"));
    expect(gcsListener.invalidateHeader.getCall(0).args[0]).to.equal(`https://www.googleapis.com/storage/v1/b/risemedialibrary-${companyId}/o/test.jpg`);

    expect(metadataDB.update.callCount).to.equal(1);
    expect(headerDB.update.callCount).to.equal(1);
  });

  it("should correctly handle disconnection status", () => {
    gcsListener.start();
    expect(messaging.onEvent.getCall(0).args[0]).to.equal("connected");
    messaging.onEvent.getCall(0).args[1]();

    expect(gcsListener.isOnline()).to.be.true;

    expect(messaging.onEvent.getCall(1).args[0]).to.equal("disconnected");
    messaging.onEvent.getCall(1).args[1]();

    expect(gcsListener.isOnline()).to.be.true;
    sandbox.clock.tick(30 * 1000);
    expect(gcsListener.isOnline()).to.be.false;
  });
});
