

module.exports = {
  parse: function (url) {
    const URL_PARAM_STRING = "url=";
    const index = url.indexOf(URL_PARAM_STRING);
    return url.substring(index+URL_PARAM_STRING.length);
  }
}