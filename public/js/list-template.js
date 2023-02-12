<style>

.trace_link {
   color            : black;
   font-size        : small;
}

.trace {
   font-size        : small;
   color            : black;
   width            : 100%;
   margin-top       : 0px;
   margin-bottom    : 13px;
   opacity          : .4;
}

.prev {
   margin-left      : 5px;
   font-size        : small;
   margin-bottom    : 25px;
}

.heading {
   font-size        : x-large;
}

</style>


<script id="list-template" type="text/x-handlebars-template">

   <div class="trace">
      <a href="#prev" class="{{screen_link}} trace_link">
         <i class="fas fa-angle-left fa-1x"></i><span class="prev">{{trace}}</span>
      </a>
   </div>

   {{#if heading}}
      <center><div class="heading">{{heading}}</div></center>
   {{/if}}

   {{#if subheading}}
      <center><div class="heading">{{subheading}}</div></center>
   {{/if}}

   {{#unless list.length}}
      {{empty_msg}}
   {{/unless}}

   {{#if list.length}}
      <div class="help">
         {{help}}
      </div>
   {{/if}}

   <div class="list-group">
      {{#each list}}

         {{#if this.form_id}}

            <div class="list-group-item">
               <form class='maker_form' id='{{this.form_id}}'>
                  <input type="text" class="form-control" name="{{this.id}}" id="{{this.id}}" placeholder="{{this.display}}">
               </form>
            </div>

         {{else}}

           {{#if this.is_end_section}}

            <a href="#{{this.id}}" class="{{../screen_link}} list_item list-group-item flex-column list-group-item-action align-items-start h-100 list_item_section">
            {{else}}
            <a href="#{{this.id}}" class="{{../screen_link}} list_item list-group-item flex-column list-group-item-action align-items-start h-100">
            {{/if}}

               {{#if this.logo}}
                  <img class="list_logo" src="{{this.logo}}">
                  {{#if (gt this.display.length "21")}}
                     <span class="list_text_smaller">{{this.display}}</span> 
                  {{else}}
                     <span class="list_text_smaller">{{this.display}}</span> 
                  {{/if}}

               {{else if this.icon}}
                  <i class="fas {{this.icon}} list_logo"></i>
                  <span class="list_text">{{this.display}}</span>
               {{else if this.card}}
                  {{{this.card}}}
               {{else}}
                  <center><span class="list_text">{{this.display}}</span> </center>
               {{/if}}

               {{#if this.help}}
                  <p class="list_help_text">{{this.help}}</p>
               {{/if}}

            </a>

         {{/if}}

      {{/each}}

      {{#if help2}}
         <div class="help2">
            {{{help2}}}
         </div>
      {{/if}}

   </div>

</script>
