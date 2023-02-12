const util         = require('util');
const zlib         = require('zlib');
const moment       = require("moment-timezone");
const NormalizeUrl = require('normalize-url');
const Url          = require('url');
const fs           = require('fs');
const stripHtml    = require("string-strip-html");
const keyword      = require("keyword-extractor");
const Status       = require("./Status");

class Util  {

   static mapExist(obj, fld) {
      if (!obj.hasOwnProperty(fld)) return false;

      for (var property in obj[fld]) {
         return true;
      }

      return false;
   }

   static movingAve(oldMean, newValue, newCount) {
      const differential = (Number(newValue) - Number(oldMean)) / Number(newCount); 
      return Number(oldMean) + differential;
   }

   static merge(onto, thing) {
      return Object.assign(onto, thing);
   }

   static diffDays(d1, d2) {
      console.info("diffDays:d1:", d1, " d2:", d2);

      const a = moment(d1);
      const b = moment(d2);
      return a.diff(b, 'days')
   }
  
   static cget(hash, attr, def) {
      return (hash && attr && hash.hasOwnProperty(attr) && hash[attr] && hash[attr].length > 0)
         ? hash[attr]
         : def
   }

   static isoToDate(iso, opts) {
      if (opts.tz) {
         return moment(iso).tz(opts.tz).format("l");
      } 
      else {
         return moment.utc(iso).format("l");
      }
   }

   static isoNow() { 
     return moment.utc().toISOString();
   }

   static isoTomorrow(days = 1) { 
     return moment().add(days,'days').utc().toISOString();
   }

   static utcNow() { 
     return moment.utc();
   }

   static isoYearNow() { 
     return moment.utc().add(1, "years").toISOString();
   }

   static tzNow(tz) {
      return moment().tz(tz).format("l");
   }

   static fmtMonDD(iso, opts) {
       const tz = (opts && opts.tz) ? opts.tz : Intl.DateTimeFormat().resolvedOptions().timeZone;

      const date = moment(iso).tz(tz);

      if (opts && opts.hms) 
         return date.format('MMM D hh:mm A');
      else
         return date.format('MMM D');
   }

   static fmtMonDDYY(iso, opts) {
      const tz = (opts && opts.tz) ? opts.tz : Intl.DateTimeFormat().resolvedOptions().timeZone;

      const date = moment(iso).tz(tz);

      if (opts && opts.hms) 
         return date.format('MMM D YYYY hh:mm A');
      else
         return date.format('MMM D YYYY');
   }

   static fmtYYYYMMDD(iso = null) {
      const date = moment(iso);
      return date.format('YYYY-MM-DD');
   }

   static fmtYYYYMMDDHH(iso = null) {
      const date = moment(iso);
      return date.format('YYYY-MM-DD-HH');
   }

   static endsWith(s, suffix) {
      return s.indexOf(suffix, this.length - suffix.length) !== -1;
   }


   static copy(item) {
      return JSON.parse(JSON.stringify(item));
   }

   static uuid() {
      var x = 2147483648;
      return Math.floor(Math.random() * x).toString(36) +
         Math.abs(Math.floor(Math.random() * x) ^ Date.now()).toString(36);
   }

   static randomWithinRange(min, max) {
     return Math.floor(Math.random() * (max - min) + min);
   }

   static checkEmailAddress(email) {
      console.info("checkEmailAddress:email:" + email);

      if (email == null || email == undefined || email === '' || email.length == 0)
         return "invalid email address";

      var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      var is_valid = re.test(email);
      console.info("checkEmailAddress:is_valid:" + is_valid);

      return (is_valid) ? null : "invalid email address";

  }// checkEmailAddress


  static subtractMoney(val1, val2) {
      let matches = /([\d+.]+)/.exec(val1);
      val1 = matches[1];

      matches = /([\d+.]+)/.exec(val2);
      val2 = matches[1];

      return this.subtractFloat(val1, val2);
   }

   static subtractNumber(val1, val2) {
      val1 = this.normalize(val1);
      val2 = this.normalize(val2); 

      const diff = (Number(val2) - Number(val1)).toString();

      return diff;
   }

   static subtractFloat(val1, val2) {
      console.debug(`subtractFloat:${val1} ${val2}`);

      val1 = this.normalize(val1);
      val2 = this.normalize(val2); 

      let diff = (parseFloat(val2) - parseFloat(val1)).toFixed(2).toString();
      if (diff.endsWith(".00")) {
         diff = diff.slice(0, -3);
      }

      return diff;
   }

   static normalize(value) {
      if (typeof value === "undefined") return "0";
      if (typeof value === "number")    return value.toString();

      var new_value = value.toLowerCase().trim();
      new_value = new_value.replace(/\s+/g, '');
      new_value = new_value.replace(/-/g, '');
      new_value = new_value.replace(/,/g, '');
      new_value = new_value.replace(/\$/g, '');

      return new_value;

   }// normalize

   static async sleep(msecs) {
      return new Promise(resolve => setTimeout(resolve, msecs))
   }

   static isTrue(value) {
      if (typeof(value) === 'string')
         value = value.trim().toLowerCase();

      switch (value) {
         case true:
         case "true":
         case 1:
         case "1":
         case "on":
         case "yes":
            return true;

         default: 
            return false;
      }
   }

   static createTmpFileSync(key, ext, data) {
      fs.writeFileSync(`/tmp/${key}.${ext}`, data); 
   }

   static normalizeUrl(rawUrl, forceHost = null) {

      // Seems way overkill, but the user could type in anything. And it's quick and easy.
      // It also does magic by turning a bare string into a url.

      let normalized_url = NormalizeUrl(rawUrl, {
         forceHttps          : true,
         stripAuthentication : true,
         stripHash           : true,
         stripWWW            : true,
         removeTrailingSlash : true
      });

      // Since normalize doesn't do it all we want we need an extra step.
      // This will also validate the format of the url, though the previous
      // call pretty much turns anything into a valid url.
      const url = new URL(normalized_url);
      url.port = ""; // no ports

      if (forceHost) {
         url.host = forceHost;
      }

      normalized_url = Url.format(url, { fragment: false, search: false, auth: false });

      normalized_url = normalized_url.replace(/\/$/, ""); // url formatting can add a trailing slash

      return normalized_url;

   }// normalizeUrl


   static fmtMoney(amount, decimalCount = 2, currency) {
      const decimal = ".";
      const thousands = ",";
      currency = currency || "$";

      try {
        decimalCount = Math.abs(decimalCount);
        decimalCount = isNaN(decimalCount) ? 2 : decimalCount;
    
        const negativeSign = amount < 0 ? "-" : "";
    
        let i = parseInt(amount = Math.abs(Number(amount) || 0).toFixed(decimalCount)).toString();
        let j = (i.length > 3) ? i.length % 3 : 0;
    
        return currency + negativeSign + (j ? i.substr(0, j) + thousands : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands) + (decimalCount ? decimal + Math.abs(amount - i).toFixed(decimalCount).slice(2) : "");

      } catch (e) {
        console.error("fmtMoney:", e)
      }
   }

   static hashCode = s => s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);

   static gzipString(s, opts = {}) {

      if (opts.strip_html)      s = stripHtml(s);
      if (opts.string_newlines) s = s.replace(/(\r\n|\n|\r)/gm, "");

      const hash_code = Util.hashCode(s);

      s = zlib.gzipSync(s).toString("base64");
 
      return { hash_code: hash_code, s: s };
   }

   static compareObjects(obj1, obj2) {
      return JSON.stringify(obj1) === JSON.stringify(obj2);
   }

   static ungzipString(s, opts = {}) {

      const buf = new Buffer(s, "base64");

      s = zlib.unzipSync(buf).toString();

      const hash_code = Util.hashCode(s);

      return { hash_code: hash_code, s: s };
   }

   static suggestNick(title) {

      const extraction = keyword.extract(title, {
         language            : "english",
         remove_digits       : true,
         return_changed_case : false, // original case
         remove_duplicates   : true
      });

      return (extraction.length > 0) 
         ?  extraction[0] // just return the first
         :  "Book";       // Better default?

   }// suggestNick

   static extractAsin(value) {
      let re = /\/dp\/([0-9a-zA-Z]{10})/i;
      let matches = re.exec(value);
      if (matches) return matches[1].toUpperCase();
   
      re = /\/gp\/([0-9a-zA-Z]{10})/i;
      matches = re.exec(value);
      if (matches) return matches[1].toUpperCase();
   
      re = /\/([0-9a-zA-Z]{10})/i;
      matches = re.exec(value);
      if (matches) return matches[1].toUpperCase();

      re = /([0-9a-zA-Z]{10})/i;
      matches = re.exec(value);
      if (matches) return matches[1].toUpperCase();

      return null;
   }

   static normalizeUrl(url) {

      const asin = Util.extractAsin(url);
      if (! asin) throw new Status("ERR_BAD_FMT", `The URL ${url} is not a valid Amazon book URL.`);

      // Create the canonical book url. This will obviously have to change if going to different amazon
      // stores or different sources other than Amazon.
      return `https://www.amazon.com/dp/${asin}`;
   }

   static isValidString(s) {
       return true;
   }

   static isValidDate(s) {
      // return moment(s).isValid(); 
      const msecs = Date.parse(s);
      return (msecs) ? true : false;
   }

   static truncateTimeStamp(ts) {
       return new Date(ts.getFullYear(), ts.getMonth(), ts.getDate());
   }

   static isTrendUp(arr, options = {}) {

      if (options.reverse) {
         arr = arr.reverse(); 
      }

      if (options.end_keep) {
         arr = arr.slice(options.end_keep * -1);
      }

      return arr.reduce((outcome, value, index, array) => {
         if (!outcome) return false // if at least one item failed, this will always return false
         if (index === 0) return true // first item cannot be checked against a previous item

         if (options.extractor) {
            value = options.extractor(value);   
            const prior = options.extractor(array[index-1]);   
            return value >= prior;
         }
         else {
            return value >= array[index-1]
         }

       }, true);
   }

   static strcmp(a, b) {
      return typeof a === 'string' && typeof b === 'string'
        ? a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0
        : a === b;
   }

   static isTrendUp(arr, options = {}) {

      if (options.reverse) {
         arr = arr.reverse(); 
      }

      if (options.end_keep) {
         arr = arr.slice(options.end_keep * -1);
      }

      return arr.reduce((outcome, value, index, array) => {
         if (!outcome) return false // if at least one item failed, this will always return false
         if (index === 0) return true // first item cannot be checked against a previous item

         if (options.extractor) {
            value = options.extractor(value);   
            const prior = options.extractor(array[index-1]);   
            console.log("UP:value:", value, " PRIOR:", prior);
            return value >= prior;
         }
         else {
            return value >= array[index-1]
         }

       }, true);
   }

   static isTrendDown(arr, options = {}) {

      if (options.reverse) {
         arr = arr.reverse(); 
      }

      if (options.end_keep) {
         arr = arr.slice(options.end_keep * -1);
      }

      return arr.reduce((outcome, value, index, array) => {
         if (!outcome) return false // if at least one item failed, this will always return false
         if (index === 0) return true // first item cannot be checked against a previous item

         if (options.extractor) {
            value = options.extractor(value);   
            const prior = options.extractor(array[index-1]);   
            console.log("DOWN:value:", value, " PRIOR:", prior);
            return value <= prior;
         }
         else {
            return value <= array[index-1]
         }

       }, true);
   }

}// Util

module.exports = Util;
