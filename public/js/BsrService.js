class BsrService  {

   constructor() {
      console.log("BsrService:");

      this.id        = 0;
      this.env       = cfg.BSR_ENV || "test"; 
      this.paypal_id = cfg.PAYPAL_ID;
      this.poller    = new Poller(cfg);

      this.amazon = {
         region           : "us-east-1",
         user_pool_id     : cfg.USER_POOL_ID, 
         client_id        : cfg.APPCLIENT_ID, 
         api_url          : cfg.BSR_API,
         uaapi_url        : cfg.BSR_UAAPI,
      };

      console.log("env:", this.env);
      console.log("amazon:", this.amazon);

      this.initContext();

      this.cmds = {
         "/update-main"          : (values) => { $("#main").html(values); }, 
         "/update-user"          : (values) => { this.updateUser(values); },
         "/update-splits"        : (values) => { this.updateSplits(values); },
         "/notify"               : (values) => { notifyUser(values); },
         "/alert"                : (values) => { notifyError(values); },
         "/show-splits"          : (values) => { this.showSplits(values); },
         "/show-books"           : ()       => { this.showBooks(); },
         "/show-book"            : (values) => { this.showBook(values); }, 

         "/"                     : (params) => {},
         "/index.html"           : (params) => { if (window.location.pathname != "/index.html") location.href = "/index.html" },
         "/user-delete"          : ()       => this.deleteUser(),
         "/book-delete"          : (params) => this.deleteBook(params),
         "/split-delete"         : (params) => this.deleteSplit(params),
         "/book-show"            : (params) => this.showBook(params),
         "/show-split-add"       : (params) => this.showSplitAdd(params),
         "/show-book-add"        : (params) => this.showBookAdd(),
         "/show-book-edit"       : (params) => this.showBookEdit(params),
         "/show-login"           : (params) => { $('#loginModal').modal('show'); $("#login-submit-button").html("Login"); },
         "/show-plans"           : (params) => { this.showPlans(params); },
         "/show-signup"          : ()       => { this.showSignUp(); },
         "/vip"                  : ()       => { this.showVip(); },
         "/show-change-password" : ()       => { $('#profileModal').modal('hide'); $('#changeModal').modal('show'); },
         "/logout"               : (params) => { this.logout(params); },
         "/logged-in"            : ()       => { $('#loginModal').modal('hide'); this.loggedIn(); },

         "/show-profile" : (params) => {
            $('#profileModal').modal('show');
            $('#profile-first').val(app.user.first_name);
            $('#profile-last').val(app.user.last_name);
            $('#profile-subscription').val(app.user.subscription);
            $(`#profile-subscription-${app.user.subscription}`).click();
            $('#profile-email').val(app.user.email);
         },

         "/show-tryit" : (params) => {
            $('#signupModal').modal('show');
            $('#signup-title').text("Send My Free Reports");
            $('#signup-submit').text("Start Receiving Reports");
         },

         "/show-forgot" : (params) => {
            $('#loginModal').modal('hide');
            $('#forgotModal').modal('show');
         }
      }

      var self = this;

      window.onpopstate = (event) => {
         console.log("onpopstate");
         self.showBooks();
         //if (! event.state) return;
         //self.routeCmd(event.state);
      }

      $(document).on("submit", "#login-form",    function(event) { self.login($(this), event); });
      $(document).on("submit", "#signup-form",   function(event) { self.signup($(this), event); });
      $(document).on("submit", "#profile-form",  function(event) { self.profile($(this), event); });
      $(document).on("submit", "#forgot-form",   function(event) { self.forgotPassword($(this), event); });
      $(document).on("submit", "#change-form",   function(event) { self.changePassword($(this), event); });
      $(document).on("submit", "#verify-form",   function(event) { self.verifyPassword($(this), event); });

      $(document).on("submit", "#splitadd-form", function(event) { 
         event.preventDefault();
         self.addSplit($(this), event); 
         return false;
      });

      $(document).on("submit", "#bookadd-form", function(event) { 
         event.preventDefault();
         self.bookAdd($(this), event); 
         return false;
      });

      $(document).on("submit", "#bookedit-form", function(event) { 
         event.preventDefault();
         self.bookEdit($(this), event); 
         return false;
      });

      $(document).on("click",  ".routable",    function(event) { 
         event.preventDefault();
         const cmd = this.getAttribute('href'); 
         self.routeCmd(cmd);
         window.history.pushState({ url: cmd }, "");
         return false; 
      });

      $(document).on("click",  ".verify",       function(event) { 
         event.preventDefault();
         event.stopImmediatePropagation();
         self.verify(this.getAttribute('href'), this.getAttribute("data-verify-msg")); 
         return false; 
      });

      $(document).on("click",  ".linkable",     function(event) { 
         event.preventDefault();
         self.link(this.getAttribute('href')); 
         return false; 
      });

   }// constructor

   initContext() {
      console.log("initContext:");

      this.context      = { tz: Intl.DateTimeFormat().resolvedOptions().timeZone }
      this.user         = null;
      this.cognito      = new Cognito(this);
      this.is_logged_in = false;
   }

   async start() {
      console.log("BSR:start:", new Date().toString());

      $('.btn-group .btn.disabled').click(function(event) {
        event.stopPropagation();
      });

      $(".button-collapse").sideNav2({
         closeOnClick : true,
         edge         : "right"
      });

      var sideNavScrollbar = document.querySelector('.custom-scrollbar');
      var ps = new PerfectScrollbar(sideNavScrollbar);

      const loadJS = function(url, location){
         const script_tag = document.createElement('script');
         script_tag.src = url;
         document.body.appendChild(script_tag);
      };
      loadJS(`https://www.paypal.com/sdk/js?client-id=${app.paypal_id}&currency=USD`);

      $("#bookedit-form").validate({
         rules: {
            "bookedit-nick" : {
               required: true
            },
            "bookedit-url" : {
               domain      : true,
               uniqueprod  : true,
               required    : true
            },
            "bookedit-period" : {
               required : true
            },
            "bookedit-owner" : {
               required : true
            }
         }
      })


      $("#bookadd-form").validate({
         rules: {
            "bookadd-nick" : {
               required: true
            },
            "bookadd-url" : {
               domain      : true,
               uniqueprod  : true,
               required    : true
            },
            "bookadd-period" : {
               required : true
            },
            "bookadd-owner" : {
               required : true
            }
         }
      })

      $("#signup-form").validate({
         rules: {
            "signup-email" : {
               required: true,
               email: true 
            },
            "signup-password" : {
               required: true
            },
            "signup-url" : {
               domain: true
            }
         }
      })

      $.fn.modal.Constructor.prototype._enforceFocus = function() {};

      $('.datepicker').datepicker();

      await this.checkLogin();

      this.routeCmd(window.location.pathname);

   }// start

   async checkLogin() {
      console.log("checkLogin:", new Date().toString());

      const is_logged_in = await this.cognito.relogin();

      if (is_logged_in) {
         console.log("checkLogin:is logged in");
         await this.relogin();
      }
      else {
         console.log("checkLogin:not logged in");
         $('.onlogin').hide();
      }

   }// checkLogin


   loggedIn() {
      console.log("loggedIn:");

      this.is_logged_in = true;

      $('.onlogout').hide();
      $('.onlogin').show();

      this.updateStates();

   }// loggedIn


   updateStates() {

      if (this.user.subscription_expired) {
         $('.hide-on-expired').hide();
      }
      else {
         $('.hide-on-expired').show();
      }

      if (this.user.plan && this.user.plan.type != "free") {
         $('.hasplan').removeClass("d-none");
         $('.noplan').hide();
      }
      else {
         $('.hasplan').addClass("d-none");
         $('.noplan').show();
      }
   }

   async relogin() {
      console.log("relogin:");

      this.invoke("/login");

   }// relogin


   async paid(plan, orderId = 0, payerId = 0, captureId = 0) {
      console.log(`paid: plan:${plan} orderId:${orderId} payerId:${payerId} captureId:${captureId}`);

      const self = this;

      function response_handler(error) {
         if (!error) {
            notifyUser("Your plan was changed.");
            self.showBooks();
         }
      }

      await this.invoke(`/paid`, { type: plan, order_id: orderId, payer_id: payerId, capture_id: captureId }, response_handler);

   }// paid


   async signup(form, event) {
      console.log("signup:");

      event.preventDefault();

      if ($(`#${event.target.id}`).valid() == false) { return false };

      try { 
         console.log("signup:plan:", $("#signup-plan").val());

         let url = $("#signup-url").val() || "https://bestsellersrank.me";
         url = url.split("?")[0]; // get rid of user's ?
         url += `?tz=${this.context.tz}`;
         if ($("#signup-plan").val()) url += "&plan=" + $("#signup-plan").val();

         await this.cognito.create($("#signup-email").val(), $("#signup-password").val(), url); 

         $('#signupModal').modal('hide');

         const signup_msg = `Congratulations. You've successully signed up for Best Sellers Rank! Now please go to your inbox and verify your email address by clicking on the verify link. After you've clicked on the link come back here and you'll be able to login and start tracking your books.`;

         bootbox.alert(signup_msg, function(){ 
            $('#loginModal').modal('show');
         });
      } 
      catch (error) {

         this.initContext();

         if (error.code && error.code === "UsernameExistsException")
            return notifyError("That user already exists. Please try another email address.");

         if (error.code && error.code === "UserNotFoundException")
            return notifyError("User not found or password invalid. Do you need to sign up as a new user?");

         if (error.code && error.code === "UserNotConfirmedException")
            return notifyError("Please confirm your email address so you can log in.");

         notifyError("There was a problem: " + error.message);
      }

   }// signup


   async deleteUser() {
      console.log("deleteUser:");

      const self = this;

      async function response_handler(error) {

         $('#profileModal').modal('hide');

         if (error) {
            notifyError("Could not delete account.");
         } else {
             notifyUser("User deleted.");
             await self.cognito.delete();
             await self.logout();
         }
      }

      await this.invoke("/user-delete", {}, response_handler);
   }

   async deleteBook(params) {
      console.log("deleteBook:params:", params);

      const self = this;

      function response_handler(error) {

         if (! error) {
            notifyUser("Your book was deleted.");
         }

         self.showBooks();
      }

      await this.invoke("/book-delete", params, response_handler);
   }

   async deleteSplit(params) {
      console.log("deleteSplit:params:", params);

      const self = this;

      function response_handler(error) {
         if (!error) {
            notifyUser("Your split was deleted.");
            self.showSplits(params);
         }
      }

      await this.invoke("/split-delete", params, response_handler);
   }

   async login(form, event) {
      console.log("login:", this.env);

      event.preventDefault();

      if ($(`#${event.target.id}`).valid() == false) { return false };

      try { 
         $("#login-submit-button").html('<span class="spinner-border spinner-border-sm"></span> Validating...');

         await this.cognito.login($("#login-email").val(), $("#login-password").val());

         this.invoke("/login");
      } 
      catch (error) {
         $("#login-submit-button").html("Login");

         if (error.code && (error.code === "UserNotFoundException" || error.code === "UnknownError")) {
            this.cognito.logout();
            notifyError("User not found or password invalid. Do you need to sign up as a new user?");
         } else if (error.code && error.code === "UserNotConfirmedException") {
            notifyError("Please confirm your email address so you can log in.");
         } else {
            notifyError("There was a problem: " + error.message);
         }
      }

   }// login

   showVip() { 
      console.log("showVip:");

      document.getElementById("signup-form").reset();
      $('#signupModal').modal('show');
      $('#signup-plan').val("free");
      $('#signup-url').attr("placeholder", "code");
      $("#signup-title").html('VIP Sign Up'); 
      $("#signup-url-label").html('Promo Code:'); 
      $("#signup-url-help").hide();
   }

   showSignUp(plan = null) { 
      console.log("showSignUp:plan:", plan);

      document.getElementById("signup-form").reset();
      $('#signupModal').modal('show');
      $("#signup-title").html('Sign Up'); 
      $('#signup-url').attr("placeholder", "B0192CTMYG");
      $("#signup-url-help").show();
      $("#signup-url-label").html('Free Amazon.com Book URL:'); 
      $('#signup-plan').val(plan || "free");
   }

   async showPlans() { 
      console.log("showPlans:");

      if (this.isLoggedIn()) {
         await this.invoke("/plans-page");
      }
      else {
         $("#main").hide().load("/uapricing.html").fadeIn('500');
         $(window).scrollTop(0);
      }
   }

   showSplits(values) { 
      console.log("showSplits:", values);

      const self = this;

      function response_handler(error, cmds) {
         const html = cvtTemplate2Html("splits-page", self.user);
         $("#main").html(html);
      }

      this.invoke("/splits-get", values, response_handler);
   }

   showBooks() { 
      console.log("showBooks:");

      $("#paypal-button-container-common").empty();
      $('#bookeditModal').modal('hide');
      $('#bookaddModal').modal('hide');

      const html = cvtTemplate2Html("books-page", this.user);
      $("#main").html(html);

      $('#bookedit-list-table').DataTable({
         bPaginate: false,
         bFilter: false,
         bLengthChange: false,
         bInfo: false,
         responsive: true,
         order: [
            [0, "asc"]
         ],
         columnDefs: [
           { "orderable": false, "targets": [2] },
         ],
         "language": {
            "emptyTable": " Looking a little lonely down here."
         }
      });

      $('.dataTables_length').addClass('bs-select');
   }

   async verifyPassword(form, event) {
      console.log("verifyPassword:");

      event.preventDefault();

      if ($(`#${event.target.id}`).valid() == false) { return false };

      try {
         await this.cognito.confirmPassword($("#verify-email").val(), $("#verify-code").val(), $("#verify-password").val());

         $('#verifyModal').modal('hide');
         $('#loginModal').modal('show');
      }
      catch (error) {
         notifyError("There was a problem: " + error.message);
      }

   }// verifyPassword


   async profile(form, event) {
      console.log("profile:");

      event.preventDefault();

      if ($(`#${event.target.id}`).valid() == false) { return false };

      const data = {
         first_name   : $("#profile-first").val(),
         last_name    : $("#profile-last").val(),
         subscription : $("input[name='profile-subscription']:checked", "#profile-form").val()
      };

      function response_handler(error) {
         if (!error) {
            notifyUser("Your profile was updated.");
         }

         $('#profileModal').modal('hide');
      }

      this.invoke("/profile", data, response_handler);

   }// profile


   async changePassword(form, event) {
      console.log("changePassword:");

      event.preventDefault();

      if ($(`#${event.target.id}`).valid() == false) { return false };

      try {
         await this.cognito.changePassword($("#change-old-password").val(), $("#change-new-password").val());

         $('#changeModal').modal('hide');
         notifyUser("Password changed.");
      }
      catch (error) {
         notifyError("There was a problem: " + error.message);
      }

   }// changePassword


   async forgotPassword(form, event) {
      console.log("forgotPassword:");

      event.preventDefault();

      if ($(`#${event.target.id}`).valid() == false) { return false };

      try {
         await this.cognito.forgotPassword($("#forgot-email").val());

         $('#forgotModal').modal('hide');
         $('#verifyModal').modal('show');
      }
      catch (error) {
         notifyError("There was a problem: " + error.message);
      }

   }// forgotPassword


   async addSplit(form, event) {
      console.log("addSplit:");

      if ($(`#${event.target.id}`).valid() == false) { return false };

      const data = {
         name       : $("#splitadd-name").val(),
         created_on : moment($("#splitadd-date").val()).utc().toISOString(),
         url        : $('#splitadd-url').val()
      };

      console.log("addSplit:data:", data);

      $("#splitadd-submit-button").prop("disabled", true);
      $("#splitadd-submit-button").html('<span class="spinner-border spinner-border-sm"></span> Validating...');

      const self = this;

      function response_handler(error) {

         if (!error) {
            notifyUser("Your split was added.");
         }

         $("#splitadd-submit-button").html('Add Split'); 
         $("#splitadd-submit-button").prop("disabled", false); 
         $('#splitaddModal').modal('hide');
         self.showBooks();
      }

      this.invoke("/split-add", data, response_handler);

   }// addSplit


   async bookAdd(form, event) {
      console.log("bookAdd:");

      if ($(`#${event.target.id}`).valid() == false) { return false };

      const data = {
         nick   : $("#bookadd-nick").val(),
         url    : $("#bookadd-url").val(),
         period : $("input[name='bookadd-period']:checked", "#bookadd-form").val(),
         owner  : $("input[name='bookadd-owner']:checked", "#bookadd-form").val()
      };

      console.log("bookAdd:data:", data);

      $("#bookadd-submit-button").prop("disabled", true);
      $("#bookadd-submit-button").html('<span class="spinner-border spinner-border-sm"></span> Validating...');

      const self = this;

      function response_handler(error) {

        if (error) {
           $("#bookadd-submit-button").html('Add Book'); 
           $("#bookadd-submit-button").prop("disabled", false); 
        }
        else { 
           self.poller.start(); 
        }
      }

      this.invoke("/book-add", data, response_handler);

   }// bookAdd


   async bookEdit(form, event) {
      console.log("bookEdit:");

      if ($(`#${event.target.id}`).valid() == false) { return false };

      const data = {
         nick      : $("#bookedit-nick").val(),
         url       : $("#bookedit-url").val(),
         period    : $("input[name='bookedit-period']:checked", "#bookedit-form").val(),
         owner     : $("input[name='bookedit-owner']:checked", "#bookedit-form").val()
      };

      console.log("bookEdit:data:", data);

      const self = this;

      function response_handler(error) {

         if (!error) {
            notifyUser("Your book was updated.");
            self.showBooks();
         }
      }

      this.invoke("/book-edit", data, response_handler);

   }// bookEdit


   isLoggedIn() {
      return this.is_logged_in;
   }

   async logout() {
      console.log("logout:");

      await this.cognito.logout();

      this.loggedOut();

      this.reload();

   }// logout

   reload() {
      console.log("reload:");
      location.href = "/index.html";
   }

   loggedOut() {

      this.initContext();

      $('.onlogin').hide();
      $('.onlogout').show();

   }// loggedOut

   updateSplits(splits) {
      console.log("updateSplits:splits:", splits);
      this.user.splits = splits;
   }

   updateUser(user) {
      console.log("updateUser:user:", user);

      this.user = user;

      if (! this.user.plan.hasOwnProperty("hourly_qty")) {
         this.user.plan.hourly_qty = 0;
      }

      this.user.hourly_cnt = 0;
      this.user.daily_cnt  = 0;
      this.user.weekly_cnt = 0;

      for (let prod of this.user.products) {
         if (prod.period == "hourly") this.user.hourly_cnt++;
         if (prod.period == "daily")  this.user.daily_cnt++;
         if (prod.period == "weekly") this.user.weekly_cnt++;
      }

      if (this.user.first_name && this.user.first_name.length > 0) {
         let initials = this.user.first_name.charAt(0);
         if (this.user.last_name) initials += this.user.last_name.charAt(0);
         $("#userrep").text(initials);
      }
      else {
         $("#userrep").html("<i class='fas fa-bars fa-1x'></i>");
      }

      if (this.user.events.length > 0) {
         for (let event of this.user.events) {
            if (event.subtype == "book-verify") {
                if (event.status == "error") {
                   notifyError(event.msg);
                } else {
                   notifyUser(event.msg);
                }

                this.poller.stop();
             }
         }

         this.invoke("/clear-events");
      }

      this.updateStates();

   }// updateUser


   async verify(cmd, msg) {
      if (!msg) msg = "Are you sure you want to perform this operation?";

      const self = this;
      
      bootbox.confirm({
          message: msg + " It can't be undone. Really, truly.", 
          buttons: {
              confirm: {
                  label: 'Yes, do it!',
                  className: 'btn-success'
              },
              cancel: {
                  label: 'No, get me out of here!',
                  className: 'btn-danger'
              }
          },
          callback: function (doit) {
             console.log('verify:doit:' + doit);
             if (doit) {
                self.routeCmd(cmd);
             }
          }
      });

   }// verify


   async showBook(params) {
      console.log("showBook:params:", params);

      $("#bookeditModal").modal('hide');
      $("#bookaddModal").modal('hide');

      $("#bookshowModal").modal('show');

      const product = this.getProduct(params.url);
      console.log(product);

      $("#bookshow-title").text(product.nick);
      $("#bookshow-book-title").text(product.last_stats.title);
      $("#bookshow-book-author").text(product.last_stats.author);
      $("#bookshow-book-url").text(extractAsin(product.url));
      $("#bookshow-book-period").text(product.period);
      $("#bookshow-book-owner").text(product.owner);
      $("#bookshow-book-last-reported").text((product.last_reported) ? moment(product.last_reported).local().format("LLL") : "None");
      $("#bookshow-book-sales-rank").text(product.last_stats.sales_rank);
      $("#bookshow-book-price").text(`${product.last_stats.currency}${product.last_stats.price}`);
      $("#bookshow-book-review-cnt").text(product.last_stats.review_cnt);
      $("#bookshow-book-review-ave").text(product.last_stats.review_ave);
      $("#bookshow-book-product-type").text(product.last_stats.product_type);

      if (product.series || product.last_stats.series) {
         const series = product.series || product.last_stats.series;
         $("#bookshow-book-series").text(`Book ${series.index} of ${series.length} in ${series.series}`);
      }

      if (product.verify_status) {
         let html = "<div class='table-responsive'><table class='table table-sm' style='margin-bottom: 0px style='margin-bottom: 0px''>"; 
         html += `<tr><td>Status</td><td>${product.verify_status}</td></tr>`;
         html += `<tr><td>Msg</td><td>${product.verify_msg}</td></tr>`;
         html += `<tr><td>Date</td><td>${moment(product.verify_on).local().format("LLL")}</td></tr>`;
         html += "</table></div>"; 
         $("#bookshow-book-verify").html(html);
      }

      if (product.last_stats.ranks) {
         let html = "<div class='table-responsive'><table class='table table-sm' style='margin-bottom: 0px'>"; 
         product.last_stats.ranks.forEach(
            e => html += `<tr><td>${e.category}</td><td>${e.rank}</td></tr>`
         );
         html += "</table></div>"; 
         $("#bookshow-book-ranks").html(html);
      }

      if (product.last_stats.review_stars) {
         const entries = Object.entries(product.last_stats.review_stars).reverse();
         let html = "<div class='table-responsive'><table class='table table-sm' style='margin-bottom: 0px'>"; 
         entries.forEach(
            e => html += `<tr><td>${e[0]}</td><td>${e[1]}</td></tr>`
         );
         html += "</table></div>"; 
         $("#bookshow-book-review-stars").html(html);
      }

      if (product.metric_history) {
         let html = "<div class='table-responsive'><table class='table table-sm' style='margin-bottom: 0px'>"; 
         for (const [key, value] of Object.entries(product.metric_history)) {
            html += `<tr><td>${key}</td><td>${Math.round(value.mean)}/${value.max}/${value.min}</td></tr>`;
         } 
         html += "</table></div>"; 
         $("#bookshow-book-history-metrics").html(html);
      }
      else {
         $("#bookshow-book-history-metrics").html("");
      }

      if (this.user.plan) {
         let html = "<div class='table-responsive'><table class='table table-sm' style='margin-bottom: 0px'>"; 
         html += `<tr><td>${this.user.plan.title}</td><td>${this.user.products.length}/${this.user.plan.qty}</td>`;
         html += `<td align="center">${this.user.hourly_cnt}H&nbsp;${this.user.daily_cnt}D&nbsp;${this.user.weekly_cnt}W</td>`;
         html += "</tr></table></div>"; 

         $("#bookshow-book-plan").html(html);
      }
   }

   reachedHourlyLimit() {
      console.log("reached hourly limit");

      $('.hourly-reached-show').show(); 
      $(".hourly-limit-show").addClass("display-only");
      $(".hourly-limit-show").attr('disabled','disabled');
   }

   unreachHourlyLimit() {
      console.log("unreach hourly limit");

      $('.hourly-reached-show').hide(); 
      $(".hourly-limit-show").removeAttr('disabled');
      $(".hourly-limit-show").removeClass("display-only");
   }

   async showSplitAdd(params) {
      console.log("showSplitAdd:", params);

      $('#splitaddModal').modal('hide');
      document.getElementById("splitadd-form").reset();
      $('#splitaddModal').modal('show');

      $("#splitadd-submit-button").html('Add Split');

      document.getElementById('splitadd-url').value = params.url;
      document.getElementById('splitadd-date').value = moment().format('YYYY-MM-DD');
   }

   async showBookAdd() {
      console.log("showBookAdd:");

      $('#bookaddModal').modal('hide');
      document.getElementById("bookadd-form").reset();
      $('#bookaddModal').modal('show');

      $("#bookadd-period-daily").click();
      $("#bookadd-owner-yours").click();

      console.log(`showBookAdd:hourly_cnt:${this.user.hourly_cnt} hourly_qty:${this.user.plan.hourly_qty}`);
      if (this.user.hourly_cnt >= this.user.plan.hourly_qty) {
         this.reachedHourlyLimit();
      }
      else {
         this.unreachHourlyLimit();
      }

      $("#bookadd-submit-button").prop("disabled", false);
      $("#bookadd-submit-button").html('Add Book');

   }// showBookAdd


   async showBookEdit(params) {
      console.log("showBookEdit:params:", params);

      $('#bookeditModal').modal('hide');
      document.getElementById("bookedit-form").reset();
      $('#bookeditModal').modal('show');

      $("#bookedit-url").prop('disabled', true);

      console.log(`showBookEdit:hourly_cnt:${this.user.hourly_cnt} hourly_qty:${this.user.plan.hourly_qty}`);
      if (this.user.hourly_cnt >= this.user.plan.hourly_qty) {
         this.reachedHourlyLimit();
      }
      else {
         this.unreachHourlyLimit();
      }

      const found = this.user.products.find(e => e.url == params.url);
      if (!found) return notifyUser("Can't edit a book that doesn't exist yet.");

      if (found.period == "hourly") this.unreachHourlyLimit();

      $(`#bookedit-period-${found.period}`).click();
      $('#bookedit-nick').val(found.nick);
      $('#bookedit-url').val(smallifyUrl(found.url));
      $(`#bookedit-owner-${found.owner}`).click();

      $("#book-delete-a").attr("href", `/book-delete?url=${found.url}`);

   }// showBookEdit

   getProduct(url) {
      return this.user.products.find(e => e.url == url);
   }

   isProductExists(url) {
      const asin = extractAsin(url);
      return this.user.products.some(e => e.url.search(asin) != -1);
   }

   async routeCmd(op) {

      switch (typeof op) {
         case "string": {
            const cmd = getUrlParams(op);
            const action = this.cmds[cmd.url];
            if (! action) throw new Error(`No command for ${op}`);
            action(cmd.values);
         }
         break;

         case "object": {
            const action = this.cmds[op.url];
            if (! action) throw new Error(`No command for ${op.url}`);
            action(op.values);
         }
         break;
      }

   }// routeCmd


   async link(href) {
      console.log(`link:${href}`);

      $("#main").hide().load(href).fadeIn('500');
      $(window).scrollTop(0);

   }// link


   async invoke(method, data = null, callback = null) {
      console.log("invoke: method:", method);

      if (method === null) return console.log("Error: invoke, no action specified.");

      try {
         if (this.isLoggedIn()) {
            const refreshed = await this.cognito.refresh();
            if (! refreshed) return this.reload();
         }

         $('#spinner').show();

         const cmd = getUrlParams(method, data);

         const result = await fetch(this.amazon.api_url, {
            method: 'POST',
            headers: {
               'Content-Type'  : 'application/json',
               'Authorization' : `Bearer ${this.cognito.id_token}`
            },
            body: JSON.stringify({
               context : this.context,
               cmd     : cmd,
               id      : this.id++
            })
         })

         $('#spinner').hide();

         const json = await result.json();

         console.log("FETCH_RESULT:", json);

         if (json.error) {
            const error = new Error(json.error.message);
            error.code = json.error.code;
            throw error;
         } 

         if (json.message && json.message == "Service Unavailable") {
            throw new Error("Sorry, the service is unavailable right now. Please retry later.");
         }

         if (json.message && json.message == "Unauthorized") {
            this.logout();
            throw new Error("Sorry, looks like your session timed out. Please login.");
         }

         for (const cmd of json.cmds) {
            this.routeCmd(cmd); 
         }

         callback && callback(null, json.cmds);
      }  
      catch (error) {
         console.log('error:', error);
         console.log('stack:' + error.stack);

         $('#spinner').hide();

         callback && callback(error);

         return notifyError("There was a problem: " + error.message);
      }

   }// invoke

}// BsrService
