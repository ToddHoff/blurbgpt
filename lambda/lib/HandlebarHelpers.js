const moment = require('moment-timezone')
const Util   = require("./Util");

const helpers = {

   pickPlural: (value, single, plural) => {
      return (Number(value) > 1) ? plural : single; 
   },

   money: (value) => {
      return Util.fmtMoney(value);
   },

   isoToDate: (iso, opts) => {
      if (opts.hash.tz) {
         return moment(iso).tz(opts.hash.tz).format("l");
      } 
      else {
         return moment(iso).format("l");
      }
   },

   subscriptionType: (user) => { 
      if (user.plan.type == "free") return "";
 
      return (user.subscription == "no") ? "non-subscription" : "subscription"; 
   },

   // {{#ifCond var1 '==' var2}}
   ifCond: (v1, operator, v2, options) => {

      switch (operator) {
         case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
         case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
         case '!=':
            return (v1 != v2) ? options.fn(this) : options.inverse(this);
         case '!==':
            return (v1 !== v2) ? options.fn(this) : options.inverse(this);
         case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
         case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
         case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
         case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
         case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
         case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
         default:
            return options.inverse(this);
      }
   },


   initialCap: (str) => { 
      if (!str) return "";
      return str.charAt(0).toUpperCase() + str.slice(1);
   },

    toColor: (value, opts) => {
       if (!value) return "black";

       const inverse = ((opts && opts.inverse) || (opts && opts.hash && opts.hash.inverse)) ? true : false;

       if (!isNaN(value)) {
          const val = Number(value);

          if (inverse) {
             if (val > 0)  return "red";
             if (val < 0)  return "green";
          } else {
             if (val > 0)  return "green";
             if (val < 0)  return "red";
          }

          return "black";
       }

       value = value.toLowerCase()

       if (value == "new")     return "blue";
       if (value == "deleted") return "red";
       if (value == "up")      return "green";
       if (value == "down")    return "red";

       return "black";
    },

    toSymbol: (opt) => {
       if (! isNaN(opt)) {
          const val = Number(opt);
          if (val > 0)  return "+";
          if (val < 0)  return "-";
          return "No change"
       }

       return "";
    },

    toAward: (value) => {

       if (value <= 0) return "&nbsp;";

       if (value == 1)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50098044442_67019be6e8_q.jpg'>";
       else if (value <= 5)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50097817021_3ca01e9b32_q.jpg'>";
       else if (value <= 10)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50097817306_0f4b0144a3_q.jpg'>";
       else if (value <= 50)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50097817086_c217dfdc18_q.jpg'>";
       else if (value <= 100)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50098044162_df9eba6e24_q.jpg'>";
       else if (value <= 250)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50097817336_83ba8c4d99_q.jpg'>";
       else if (value <= 500)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50097817061_608f2d0886_q.jpg'>";
       else if (value <= 1000)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50097238008_cf635901bd_q.jpg'>";
       else if (value <= 2000)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50097238328_41d9630362_q.jpg'>";
       else if (value <= 3000)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50098044292_6004b23b13_q.jpg'>";
       else if (value <= 4000)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50098044557_3a9540c48b_q.jpg'>";
       else if (value <= 5000)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50097238218_dd17b9bb84_q.jpg'>";
       else if (value <= 6000)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50097238348_80ec45bf6b_q.jpg'>";
       else if (value <= 7000)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50098044342_3b90b144c4_q.jpg'>";
       else if (value <= 8000)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50098044577_1bf6f92933_q.jpg'>";
       else if (value <= 9000)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50097238238_87e0e51bac_q.jpg'>";
       else if (value <= 10000)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50097817036_f07721bb99_q.jpg'>";
       else if (value <= 15000)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50098044492_ed60ac96f9_q.jpg'>";
       else if (value <= 20000)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50098044392_38f611516a_q.jpg'>";
       else if (value <= 25000)
          return "&nbsp; <img class='award' src='https://live.staticflickr.com/65535/50097238263_ac72782deb_q.jpg'>";

       return "&nbsp;";
    },

    fmtNumber: (value, opts) => {
       if (value === undefined || (opts.hash.noz && value == 0)) return ""; 

       if (opts.hash.abs)   value = Math.abs(value);
       if (opts.hash.round) value = Math.round(value);

       if (opts.hash.money) return Util.fmtMoney(value, 2, opts.hash.currency);

       if (opts.hash.decimals)
          return Number(value).toLocaleString('en-US', 
                    { style: 'decimal', maximumFractionDigits : opts.hash.decimals, minimumFractionDigits : opts.hash.decimals });
       else 
          return Number(value).toLocaleString();
    },

   // {{#ifCond var1 '==' var2}}
   ifCond: (v1, operator, v2, options) => {

      switch (operator) {
         case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
         case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
         case '!=':
            return (v1 != v2) ? options.fn(this) : options.inverse(this);
         case '!==':
            return (v1 !== v2) ? options.fn(this) : options.inverse(this);
         case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
         case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
         case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
         case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
         case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
         case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
         default:
            return options.inverse(this);
      }
   }

};

module.exports = (Handlebars) => {

   if (!Handlebars || typeof Handlebars.registerHelper !== "function") 
      throw(new Error("Handlebars not defined.")); 

   for (var prop in helpers) {
      Handlebars.registerHelper(prop, helpers[prop]);
   }

   return helpers;
};
