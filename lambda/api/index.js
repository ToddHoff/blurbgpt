'use strict';

console.log('Start BSR API env:', process.env.BSR_ENV);

const Router            = require('routes');
const Path              = require('path');
const AppCfg            = require("./lib/AppCfg");
const Util              = require("./lib/Util");
const UsersDto          = require('./lib/UsersDto');
const SplitsDto         = require('./lib/SplitsDto');
const StatsDto          = require('./lib/StatsDto');
const Plans             = require('./lib/Plans');
const Status            = require("./lib/Status");
const EventDto          = require("./lib/EventDto");
const ApplyDataTemplate = require("./lib/ApplyDataTemplate");


const ROUTER = Router();
const PLANS  = new Plans();


// Methods:
// /login /paid /profile /book-edit /book-add /book-delete /plans-page
// /poll
//
// Note: we must always be logged in.
//
const AUTHORIZE_STATES = {
   expired : { 
      "/login": true,         "/paid": true,        "/profile": false,    "/book-add": false, 
      "/book-edit": false,    "/book-delete": true, "/plans-page": true,  "/poll": false,
      "/clear-events": false, "/user-delete": true, "/splits-get": false, "/split-add": false,
      "/split-delete": false
   },

   active : { 
      "/login": true,         "/paid": true,         "/profile": true,    "/book-add": true,  
      "/book-edit": true,     "/book-delete": true,  "/plans-page": true, "/poll": true,
      "/clear-events": true,  "/user-delete": true,  "/splits-get": true, "/split-add": true,
      "/split-delete": true
   }
}

const OVERRIDE_PRICE_USERS = {
   "todd.hoffious@gmail.com"       : ".01",
   "toddhoffious@gmail.com"        : ".01",
   "lindagcoleman@gmail.com"       : ".01",
   "linda@possibility.com"         : ".01",
   "lgc@possibility.com"           : ".01",
   "prodbestsellersrank@gmail.com" : ".01"
}

const VALID_USERS = {
   "prodbestsellersrank@gmail.com" : 1,
   "toddhoffious@gmail.com": 1,
   "toddhoffiou.s@gmail.com": 1,
   "todd.hoffious@gmail.com": 1,
   "lindagcoleman@gmail.com": 1,
   "linda@possibility.com": 1,
   "lgc@possibility.com": 1,
   "mail@davidgaughran.com": 1,
   "testbestsellersrank@gmail.com": 1,
   "testbestsellers.rank@gmail.com": 1,
   "t.estbestsellersrank@gmail.com": 1,
   "te.stbestsellersrank@gmail.com": 1,
   "tes.tbestsellersrank@gmail.com": 1,
   "test.bestsellersrank@gmail.com": 1,
   "testb.estsellersrank@gmail.com": 1,
   "testbe.stsellersrank@gmail.com": 1,
   "testbes.tsellersrank@gmail.com": 1,
   "testbest.sellersrank@gmail.com": 1,
   "testbestse.llersrank@gmail.com": 1,
   "testbestsell.ersrank@gmail.com": 1,
   "testbestselle.rsrank@gmail.com": 1,
}


ROUTER.addRoute('/clear-events', async (request, cfg, user, cmds) => {
   console.info("clear-events:");

   await user.purgeEvents();

})// clear-events


ROUTER.addRoute('/poll', async (request, cfg, user, cmds) => {
   console.info("poll:");

   // Currenly all we have is polling for added books.
   cmds.push({ url: "/update-user", values: user.fmtSafe() });

})// poll


ROUTER.addRoute('/login', async (request, cfg, user, cmds) => {
   console.info("login:");

   // We always get the user so it should be available.

   cmds.push({ url: "/update-user", values: user.fmtSafe() });
   cmds.push({ url: "/logged-in" });

   // We already have a generator for the page so use it.
   async function gen_pricing_page() {
      const m = ROUTER.match("/plans-page");
      await m.fn(request, cfg, user, cmds);
   }

   if (user.data.signup_plan) {

      // If a signup plan was specified then our main page will be the signup page.
      await gen_pricing_page();

      // To prevent a loop we only want to execute it once.
      delete user.data.signup_plan; 
      user.is_dirty = true;
   }
   else if (user.data.subscription_expired) {

      // If the user's subscription expired pretty much all they can do is purchase another plan.
      await gen_pricing_page();
      cmds.push({ url: "/alert", values: "Your plan has expired. Please purchase a new plan." });
   }
   else {
      cmds.push({ url: "/show-books" });
   }

})// login


ROUTER.addRoute('/paid', async (request, cfg, user, cmds) => {
   console.info("paid:");

   if (! request.hasOwnProperty("type"))       throw new Status("ERR_BAD_REQUEST", "Type is required.");
   if (! request.hasOwnProperty("order_id"))   throw new Status("ERR_BAD_REQUEST", "Order ID is required.");
   if (! request.hasOwnProperty("payer_id"))   throw new Status("ERR_BAD_REQUEST", "Payer ID is required.");
   if (! request.hasOwnProperty("capture_id")) throw new Status("ERR_BAD_REQUEST", "Capture ID is required.");

   await user.switchToNewPlan(request);

   cmds.push({ url: "/update-user", values: user.fmtSafe() });

})// paid


ROUTER.addRoute('/profile', async (request, cfg, user, cmds) => {
   console.info("profile:");

   UsersDto.validate(request);

   user.data.first_name    = request.first_name;
   user.data.last_name     = request.last_name;
   user.data.subscription  = request.subscription;
   user.is_dirty           = true;

   cmds.push({ url: "/update-user", values: user.fmtSafe() });

})// profile


ROUTER.addRoute('/user-delete', async (request, cfg, user, cmds) => {
   console.info("user-delete:");

   await user.obliderate();

})// user-delete


ROUTER.addRoute('/split-add', async (request, cfg, user, cmds) => {
   console.info("split-add:");

   request.user_id = user.data.email;

   const splits = new SplitsDto(cfg, request);
   await splits.create(); // validation occurs in the create

   await splits.get();
   cmds.push({ url: "/update-splits", values: splits.data.splits});

})// split-add


ROUTER.addRoute('/splits-get', async (request, cfg, user, cmds) => {
   console.info("splits-get:");

   if (! request.hasOwnProperty("url")) throw new Status("ERR_BAD_REQUEST", "URL is required.");

   const splits = new SplitsDto(cfg, { user_id: user.data.email, url: request.url });

   // Get splits for a few days..
   await splits.getByDateRange(Util.isoTomorrow(-3), Util.isoTomorrow(3));

   cmds.push({ url: "/update-splits", values: { url: request.url, items: splits.data.splits}});

})// splits-get


ROUTER.addRoute('/split-delete', async (request, cfg, user, cmds) => {
   console.info("split-delete:");

   request.user_id = user.data.email;

   const splits = new SplitsDto(cfg, request);
   await splits.remove(); // validation occurs hre

})// split-delete


ROUTER.addRoute('/book-add', async (request, cfg, user, cmds) => {
   console.info("book-add:");

   if (! request.hasOwnProperty("nick"))   throw new Status("ERR_BAD_REQUEST", "Nick is required.");
   if (! request.hasOwnProperty("url"))    throw new Status("ERR_BAD_REQUEST", "Url is required.");
   if (! request.hasOwnProperty("period")) throw new Status("ERR_BAD_REQUEST", "Period is required.");
   if (! request.hasOwnProperty("owner"))  throw new Status("ERR_BAD_REQUEST", "Owner is required.");

   // TODO: Add field validation.

   await user.addProduct(request);

})// book-add


ROUTER.addRoute('/book-edit', async (request, cfg, user, cmds) => {
   console.info("book-edit:");

   if (! request.hasOwnProperty("nick"))   throw new Status("ERR_BAD_REQUEST", "Nick is required.");
   if (! request.hasOwnProperty("url"))    throw new Status("ERR_BAD_REQUEST", "Url is required.");
   if (! request.hasOwnProperty("period")) throw new Status("ERR_BAD_REQUEST", "Period is required.");
   if (! request.hasOwnProperty("owner"))  throw new Status("ERR_BAD_REQUEST", "Owner is required.");

   // TODO: Add field validation.

   await user.updateProduct(request);

   cmds.push({ url: "/update-user", values: user.fmtSafe() });

})// book-edit


ROUTER.addRoute('/book-delete', async (request, cfg, user, cmds) => {
   console.info("book-delete:");

   if (! request.hasOwnProperty("url")) throw new Status("ERR_BAD_REQUEST", "Url is required.");

   await user.deleteProduct(request.url);

   cmds.push({ url: "/update-user", values: user.fmtSafe() });

})// book-delete


ROUTER.addRoute('/plans-page', async (request, cfg, user, cmds) => {
   console.info("plans-page:");

   const schedule = PLANS.calcNewPlanSchedule(
      user.data.plan, 
      user.data.products.length, 
      user.isExpired(), 
      user.getHourlyCnt(), 
      cfg.paypal.override_price
   )

   const path = Path.join(__dirname, 'views', "plans-page.hbs"); 
   const html = ApplyDataTemplate(path, { 
      cfg      : cfg, 
      user     : user.data,
      plans    : schedule
   })

   cmds.push({ url: "/update-main", values: html });

})// plans-page


function fmt_response(error, cmds, request) {

    let data = {
       id: (request) ? request.id : 0
    };

    if (error) {
      data.error = {
        code    : (error.code) ? error.code : 0,
        message : error.message,
        data    : (error.data) ? error.data : {}
      }
    } else {
      data.cmds = cmds; 
    }

    const response = {
       statusCode: 200,
       headers: {
            "Access-Control-Allow-Origin" : "*"
       },
       body: JSON.stringify(data)
    };

    console.info("response: " + JSON.stringify(response))

    return response;

}// fmt_response


process.on('unhandledRejection', error => {
  console.error('unhandledRejection:', error.message);
});


function check_authorization(request, cfg, userDto) {
    
    const state = (userDto.isExpired()) ? "expired" : "active";

    const auth_map = AUTHORIZE_STATES[state];

    const is_auth = auth_map[request.url];
    console.info(`check_authorization:state:${state} is_auth:${is_auth} url:${request.url}`);

    if (! is_auth) throw new Status("ERR_UNAUTHORIZED_OP", `${request.method} is unauthorized.`); 

}// check_authorization


exports.handler = async (event, context) => {
   console.info("handler:env:", process.env.BSR_ENV, " event:", event, " context:", context);

   let request = null;

   try {
      if (! event.hasOwnProperty("body")) throw new Status("BAD_REQUEST", "Body required.");

      const cfg = new AppCfg();

      request = JSON.parse(event.body);
      console.log("request:", request);

      if (! request.hasOwnProperty("cmd")) throw new Status("BAD_REQUEST", "Cmd required.");

      // We should be in a logged in context so the email address should be available.
      const email = event.requestContext.authorizer.jwt.claims.email;
      if (! email) throw new Status("BAD_REQUEST", "Email required.");
      console.info("email:", email);

      if (cfg.isTest() && !VALID_USERS[email]) { 
         throw new Error("You are not on the allow list.");
      }

      if (request.context.tz) cfg.tz = request.context.tz;

      const user_dto = new UsersDto(cfg, { email: email });
      if (! await user_dto.get()) throw new Status("UserNotFoundException", "Unknown user.");

      if (cfg.isProd() && OVERRIDE_PRICE_USERS[email]) {
         cfg.paypal.override_price = OVERRIDE_PRICE_USERS[email]; 
      }

      // Route request
      const m = ROUTER.match(request.cmd.url);
      if (m) {

        check_authorization(request.cmd, cfg, user_dto);

        const cmds = [];
        await m.fn(request.cmd.values, cfg, user_dto, cmds);

        if (user_dto.is_dirty) await user_dto.update();

        return fmt_response(null, cmds, request);
      }

      throw new Status("BAD_REQUEST", "Unknown method: " + request.cmd.method);

   } 
   catch (error) {
      console.error('handler:' + error.message);
      console.error('stack:' + error.stack);

      return fmt_response(error, null, request);
   }

}// handler
