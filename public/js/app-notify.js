
$.notify.addStyle('msg', {
  html: "<div><span data-notify-text/></div>",
  classes: {
    normal: {
      "margin"           : "5px",
      "padding"          : "15px 15px 15px 15px",
      "opacity"          : "0.90",
      "background-color" : "#28a745",
      "color"            : "white",
      "border-radius"    : "5px",
      "font-size"        : "large",
      "line-height"      : "1.5",
      "vertical-align"   : "middle",
      "box-shadow"       : "0 12px 15px 0 rgba(0,0,0,0.16), 0 2px 10px 0 rgba(0,0,0,0.12)",
      "font-family"      : "Roboto,sans-serif"
    },
    error: {
      "margin"           : "5px",
      "padding"          : "15px 15px 15px 15px",
      "opacity"          : "0.90",
      "background-color" : "#dc3545",
      "color"            : "white",
      "border-radius"    : "5px",
      "font-size"        : "large",
      "line-height"      : "1.5",
      "vertical-align"   : "middle",
      "box-shadow"       : "0 12px 15px 0 rgba(0,0,0,0.16), 0 2px 10px 0 rgba(0,0,0,0.12)",
      "font-family"      : "Roboto,sans-serif"
    }
  }
});


notifyError = function(msg, delay = null) {

   $.notify(msg, {
      clickToHide   : true,
      autoHideDelay : delay || 6000,
      globalPosition: 'top left',
      style         : 'msg',
      className     : 'error',
      showAnimation : 'slideDown',
      showDuration  : 600, 
      hideAnimation : 'slideUp',
      hideDuration  : 600,
      arrowShow     : true,
      arrowSize     : 15
   })

   return null;
}


notifyUser = function(msg, delay = null) {

   $.notify(msg, {
      clickToHide   : true,
      autoHideDelay : delay || 4000,
      globalPosition: 'top left',
      style         : 'msg',
      className     : 'normal',
      showAnimation : 'slideDown',
      showDuration  : 600, 
      hideAnimation : 'slideUp',
      hideDuration  : 600,
      arrowShow     : true,
      arrowSize     : 15
   })

   return null;
}
