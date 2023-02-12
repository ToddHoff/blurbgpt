'use strict';

// OK
// ERR_UNKNOWN
//

function Status(code, message) {
  const error = new Error(message || "");
  error.code  = code;
  return error; 
}

if (typeof exports === "object" && exports) {
   module.exports = Status;
}
