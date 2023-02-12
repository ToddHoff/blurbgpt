
function cvtTemplate2Html(id, data) {
   //console.log("cvtTemplate2Html:id:", id);

   let el = document.getElementById(id);
   if (! el) throw new Error("No template for " + id);

   return Handlebars.compile(el.innerHTML)(data);
}

function getUrlParams(url, combine) {
   const values = combine || {};
   const parts  = url.split("?");

   if (parts[1]) {
      const params = parts[1].split("&");
      params.forEach(function(item) {values[item.split("=")[0]] = item.split("=")[1]})
   }

   return { url: parts[0], values: values};
}

function extractAsin(value) {
   let re = /\/dp\/([0-9a-zA-Z]{10})/i;
   let matches = re.exec(value);
   if (matches) return matches[1];

   re = /\/gp\/([0-9a-zA-Z]{10})/i;
   matches = re.exec(value);
   if (matches) return matches[1];

   re = /\/([0-9a-zA-Z]{10})/i;
   matches = re.exec(value);
   if (matches) return matches[1];

   value = value.trim();
   if (value.length != 10) return null;

   re = /([0-9a-zA-Z]{10})/i;
   matches = re.exec(value);
   if (matches) return matches[1];

   return null;
}

function smallifyUrl(url) {
   return url.replace(/^https?\:\/\/www.amazon.com/i, "");
}
