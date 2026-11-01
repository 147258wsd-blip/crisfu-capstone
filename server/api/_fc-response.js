/* Express calls Object.setPrototypeOf(res, app.response) inside its own init
   middleware, so any method that lives on a prototype is wiped the moment the
   request enters the app. Everything below therefore hangs off the instance
   itself — own properties are the only shape Express cannot clobber. */

const BINARY = /^image\/|^font\/|woff|octet-stream/;
const isBinary = (type) => BINARY.test(type || "");

/* morgan and on-finished attach listeners to res.socket as well, so the fake
   socket has to be event-shaped even though nothing ever writes to it */
function fakeSocket() {
  return {
    writable: true,
    destroyed: false,
    remoteAddress: "0.0.0.0",
    on() {
      return this;
    },
    once() {
      return this;
    },
    addListener() {
      return this;
    },
    removeListener() {
      return this;
    },
    emit() {
      return false;
    },
  };
}

function createResponse() {
  const listeners = Object.create(null);
  const res = {};

  res.statusCode = 200;
  res.statusMessage = "OK";
  res.headersSent = false;
  res.finished = false;
  res.writableEnded = false;
  res.req = null;
  res.socket = fakeSocket();
  res._headers = {};
  res._chunks = [];

  res.setHeader = (name, value) => {
    res._headers[String(name).toLowerCase()] = Array.isArray(value)
      ? value.map(String)
      : value;
    return res;
  };

  res.appendHeader = (name, value) => {
    const key = String(name).toLowerCase();
    const prev = res._headers[key];
    if (prev === undefined) return res.setHeader(name, value);
    return res.setHeader(name, [].concat(prev, value).join(", "));
  };

  res.getHeader = (name) => res._headers[String(name).toLowerCase()];
  res.getHeaders = () => ({ ...res._headers });
  res.getHeaderNames = () => Object.keys(res._headers);
  res.hasHeader = (name) =>
    Object.prototype.hasOwnProperty.call(res._headers, String(name).toLowerCase());
  res.removeHeader = (name) => {
    delete res._headers[String(name).toLowerCase()];
    return res;
  };

  res.writeHead = (statusCode, statusMessage, headers) => {
    res.statusCode = statusCode;
    if (typeof statusMessage === "string") res.statusMessage = statusMessage;
    const extra = typeof statusMessage === "object" ? statusMessage : headers;
    if (Array.isArray(extra)) {
      for (let i = 0; i < extra.length; i += 2) res.setHeader(extra[i], extra[i + 1]);
    } else if (extra && typeof extra === "object") {
      for (const k of Object.keys(extra)) res.setHeader(k, extra[k]);
    }
    res.headersSent = true;
    return res;
  };

  res.flushHeaders = () => {
    res.headersSent = true;
  };

  res.write = (chunk, encoding, callback) => {
    if (chunk != null) {
      const buf = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(String(chunk), encoding === "binary" ? "latin1" : "utf8");
      res._chunks.push(buf);
    }
    const cb = typeof encoding === "function" ? encoding : callback;
    if (typeof cb === "function") cb();
    return true;
  };

  res.end = (chunk, encoding, callback) => {
    if (chunk != null) res.write(chunk, encoding);
    const cb = typeof encoding === "function" ? encoding : callback;
    if (typeof cb === "function") cb();
    if (res.finished) return res;
    res.finished = true;
    res.writableEnded = true;
    res.headersSent = true;
    res.emit("finish");
    res.emit("close");
    return res;
  };

  res.destroy = () => {
    res.finished = true;
    res.emit("close");
    return res;
  };

  /* a five-method emitter, enough for on-finished / send, and immune to the
     prototype swap that kills a real EventEmitter */
  res.on = (name, fn) => {
    (listeners[name] || (listeners[name] = [])).push(fn);
    return res;
  };
  res.addListener = res.on;
  res.once = (name, fn) => {
    const wrapper = (...args) => {
      res.removeListener(name, wrapper);
      fn(...args);
    };
    return res.on(name, wrapper);
  };
  res.off = res.removeListener = (name, fn) => {
    const arr = listeners[name];
    if (arr) {
      const i = arr.indexOf(fn);
      if (i !== -1) arr.splice(i, 1);
    }
    return res;
  };
  res.removeAllListeners = (name) => {
    if (name) delete listeners[name];
    else Object.keys(listeners).forEach((k) => delete listeners[k]);
    return res;
  };
  res.emit = (name, ...args) => {
    const arr = listeners[name];
    if (!arr || !arr.length) return false;
    for (const fn of arr.slice()) fn(...args);
    return true;
  };
  res.listenerCount = (name) => (listeners[name] || []).length;

  res._fcResult = () => {
    const body = Buffer.concat(res._chunks);
    const type = res._headers["content-type"] || "application/json; charset=utf-8";
    const binary = isBinary(String(type));
    const headers = {};
    for (const k of Object.keys(res._headers)) {
      const v = res._headers[k];
      headers[k] = Array.isArray(v) ? v.join(", ") : String(v);
    }
    return {
      statusCode: res.statusCode || 200,
      headers,
      isBase64Encoded: binary,
      body: binary ? body.toString("base64") : body.toString("utf8"),
    };
  };

  return res;
}

module.exports = { createResponse };
