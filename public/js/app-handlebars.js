( function() {
   console.log("Adding Handlebars.");

   Handlebars.registerHelper({

      isoFmt: (ts) => { return moment(ts).format("L hh:mm a"); },

      isoDateFmt: (ts) => { return moment(ts).format("L"); },

      numFmt: (n) => { return n.toLocaleString(); },

      statusToColor: (status) => { 

         switch (status) {
            case "error"      : return "#E18D96"; 
            case "unverified" : return "#5E96AE"; 
            case "verified"   : return "#FDFD96"; 
            default           : return "#F3DDB3";
         }
      },

      title: (url) => {
          const product = app.getProduct(url);
          return (product) ? product.last_stats.title : "No Title";
      },

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
   })

}() );
