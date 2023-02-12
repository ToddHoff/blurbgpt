const Handlebars       = require('handlebars');
const HandlebarHelpers = require('./HandlebarHelpers')(Handlebars);

module.exports = (source, data = {}) => {
   const template = Handlebars.compile(source, {noEscape: true});
   return template(data);
}
