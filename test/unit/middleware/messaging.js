const assert = require("assert");
const sinon = require("sinon");
const Primus = require("primus");
let socketInstance, messaging;
let logger = {
  info: function (x){},
  error:function (x){},
  warn: function (x){}
};

function Socket(url) {
  socketInstance.url = url;
  return socketInstance;
}

function getCalls(method) {
  let calls = [];

  for(let i = 0; i < method.callCount; i++) {
    calls.push(method.getCall(i));
  }

  return calls;
}

describe("Messaging", ()=>{
  var sandbox = null;

  beforeEach(()=>{
    sandbox = sinon.sandbox.create();

    socketInstance = {
      end: sandbox.stub(),
      on: sandbox.stub(),
      write: sandbox.stub()
    };
    sandbox.stub(Primus, "createSocket").returns(Socket);

    const Messaging = require("../../../app/middleware/messaging.js");
    messaging = new Messaging("testDisplay", "testMachine", "testUrl", logger);
  });

  afterEach(()=>{
    sandbox.restore();
    messaging.disconnect();
  });

  describe("init", ()=>{
    it("connects", ()=>{
      messaging.init("TEST");
      assert(socketInstance.on.called);
    });

    it("closes existing connection", ()=>{
      messaging.init("TEST");
      messaging.init("TEST");
      assert(socketInstance.end.called);
    });

    it("registers error handler", ()=>{
      sandbox.stub(logger, "error");
      messaging.init("TEST");

      let call = getCalls(socketInstance.on).filter((call)=> call.args[0] === "error")[0];
      assert(call);
      let handler = call.args[1];
      handler({stack: "test"});
      assert(logger.error.called);
    });

    it("registers data handler", ()=>{
      messaging.init("TEST");
      let call = getCalls(socketInstance.on).filter((call)=> call.args[0] === "data")[0];
      assert(call);
      let handler = call.args[1];
      assert(handler);
    });
  });

  describe("handlers", ()=>{
    let messagingInternalDataHandler;

    beforeEach(()=>{
      messaging.init("TEST");
      let dataHandlerRegistration = getCalls(socketInstance.on).filter((call)=>call.args[0] === "data")[0];
      assert(dataHandlerRegistration);
      messagingInternalDataHandler = dataHandlerRegistration.args[1];
    });

    it("calls handlers", ()=>{
      let externalAttachingHandler = sandbox.stub();
      messaging.on("test-message", externalAttachingHandler);
      messagingInternalDataHandler({msg: "test-message", displayId: "12345"});
      assert(externalAttachingHandler.called);
    });
  });

  describe("write", ()=>{
    beforeEach(()=>{
      messaging.init("TEST");
    });

    it("calls socket.write", ()=>{
      messaging.write("test");
      assert(socketInstance.write.called);
      assert(socketInstance.write.getCall(0).args[0] === "test");
    });
  });

  describe("disconnect", ()=>{
    it("ends the connection", ()=>{
      messaging.init("TEST");
      messaging.disconnect();
      assert(socketInstance.end.called);
    });
  });
});
