( function() {
   console.log("Adding validators.");

   $.validator.setDefaults({
      errorClass: 'app-error-class',
      highlight: function(element) {
         $(element).removeClass('is-valid').addClass('is-invalid');
      },
      unhighlight: function(element) {
         $(element).removeClass('is-invalid').addClass('is-valid');
      }
   })

   $.validator.addMethod(
      "domain", 
      function(value, element) {
         const asin = extractAsin(value);
         if (asin) $(`#${element.id}`).val(asin);
        return this.optional(element) || asin;
      }, 
      "Please enter a book URL. It can be a full URL or something like B0192CTMYG"
   )

   $.validator.addMethod(
      "uniqueprod", 
      function(value, element) {
         return ! app.isProductExists(value); 
      }, 
      "Please enter a unique book URL."
   )

   return $;

}() );
