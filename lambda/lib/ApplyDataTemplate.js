const fs               = require('fs');
const Handlebars       = require('handlebars');
const HandlebarHelpers = require('./HandlebarHelpers')(Handlebars);

module.exports = (path, data) => {
   console.info("applyDataTemplate:start: path:" + path);

   const source   = fs.readFileSync(path, "utf8");
   const template = Handlebars.compile(source, {noEscape: true});
   const result   = template(data);

   return result;
}
