process.env.OFF   = true;
process.env.INFO  = true;
process.env.TRACE = true;

const log_levels = {
         "OFF"    : process.env.OFF   || false,
         "DEBUG"  : process.env.DEBUG || false,
         "INFO"   : process.env.INFO  || true,
         "TRACE"  : process.env.TRACE || true
      }

console.log(log_levels);

