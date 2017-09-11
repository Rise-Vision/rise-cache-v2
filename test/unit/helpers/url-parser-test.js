"use strict";

const chai = require("chai"),
  expect = chai.expect,
  urlParser = require("../../../app/helpers/url-parser");


describe("URL Parser", () => {

  it("should parse simple url", () => {
    let url = "/files?url=https://storage.googleapis.com/risemedialibrary-30007b45-3df0-4c7b-9f7f-7d8ce6443013/20664067_328469167623764_3829134819125509256_n.jpg";

    expect(urlParser.parse(url)).to.equal("https://storage.googleapis.com/risemedialibrary-30007b45-3df0-4c7b-9f7f-7d8ce6443013/20664067_328469167623764_3829134819125509256_n.jpg");
  });

  it("should parse url with space", () => {
    let url = "/files?url=https://storage.googleapis.com/risemedialibrary-30007b45-3df0-4c7b-9f7f-7d8ce6443013/20664067_328469167623764_%203829134819125509256_n.jpg";

    expect(urlParser.parse(url)).to.equal("https://storage.googleapis.com/risemedialibrary-30007b45-3df0-4c7b-9f7f-7d8ce6443013/20664067_328469167623764_%203829134819125509256_n.jpg");
  });

  it("should parse url with hash", () => {
    let url = "/files?url=https://storage.googleapis.com/risemedialibrary-30007b45-3df0-4c7b-9f7f-7d8ce6443013/20664067_328469167623764_%233829134819125509256_n.jpg";

    expect(urlParser.parse(url)).to.equal("https://storage.googleapis.com/risemedialibrary-30007b45-3df0-4c7b-9f7f-7d8ce6443013/20664067_328469167623764_%233829134819125509256_n.jpg");
  });


  it("should parse url with special character", () => {
    let url = "/files?url=https://storage.googleapis.com/risemedialibrary-30007b45-3df0-4c7b-9f7f-7d8ce6443013/St%C3%A5ende%20annonser/20664067_328469167623764_3829134819125509256_n.jpg";

    expect(urlParser.parse(url)).to.equal("https://storage.googleapis.com/risemedialibrary-30007b45-3df0-4c7b-9f7f-7d8ce6443013/St%C3%A5ende%20annonser/20664067_328469167623764_3829134819125509256_n.jpg");
  });


  it("should parse 3rd party url", () => {
    let url = "/files?url=https://test.com/files/?name=top&size=20";

    expect(urlParser.parse(url)).to.equal("https://test.com/files/?name=top&size=20");
  });

  it("should parse with a slash after files", () => {
    let url = "/files/?url=https://test.com/files/?name=top&size=20";

    expect(urlParser.parse(url)).to.equal("https://test.com/files/?name=top&size=20");
  });


  it("should not parse correctly if it does not have a url parameter", () => {
    let url = "/files/?name=https://test.com/files/?name=top&size=20";

    expect(urlParser.parse(url)).to.not.equal("https://test.com/files/?name=top&size=20");
  });

});