const Util   = require("./Util");
const Status = require("./Status");

// Plan scenarios:
// singup           : user starts with a free plan that should expire in a year
// signup with plan : user selected a plan from the pricing page and immediately upgrades when they login
// upgrade/downgrade: user has an existing plan and they upgrade or downgrade
// expires          : a plan expires and the user selects another plan
//
class Plans {

   static DEFAULT_FREE_PLAN = { 
      type      : "free", 
      title     : "Free Plan", 
      price     : 0.00, 
      ppd       : 0.00,
      qty       : 1, 
      hourly_qty: 0, 
      started_on: Util.isoNow(), 
      expires_on: Util.isoYearNow() 
   };

   constructor() {
      // ppd = price per day

      this.free  = { type: "free",  "title": "Free Plan",  short: "1 Book",  "price" : 0.00,  "qty" : 1,   "ppd": 0.00, idx: 0,
         hourly_qty : 0,
         benefits : [
            "Ad supported.",
            "Track 1 book.",
            "Reports sent daily."
         ]
      }

      this.plan5_0 = { type: "plan5_0", "title": "Five Book Plan", short: "5 Books", "price" : 25.00, "qty" : 5,   "ppd": 0.0685, idx: 1,
         hourly_qty : 0,
         benefits : [
            "A little over a penny per day per book.",
            "Completely ad free.",
            "Track up to 5 books.",
            "Select from daily or weekly reports."
         ]
      }

      this.plan10_0 = { type: "plan10_0", "title": "Ten Book Plan", short: "10 Books", "price" : 45.00, "qty" : 10,   "ppd": 0.1233, idx: 2,
         hourly_qty : 0,
         benefits : [
            "A little over a penny per day per book.",
            "Completely ad free.",
            "Track up to 10 books.",
            "Select from daily or weekly reports."
         ]
      }

      this.plan20_1 = { type: "plan20_1", "title": "Twenty Book Plan", short: "20 Books", "price" : 99.00, "qty" : 20,   "ppd": 0.2712, idx: 3,
         hourly_qty : 1,
         benefits : [
            "A little over a penny per day per book.",
            "Completely ad free.",
            "Track up to 20 books.",
            "Select from daily or weekly reports.",
            "Hourly reports available for one book."
         ]
      }

      this.plans = [this.free, this.plan5_0, this.plan10_0, this.plan20_1];

   }// constructor

   get(name) {
      return this[name];
   }

   // Standard Charge. Subscription extended for unused portion of lower plan
   // Return days to add to now.
   //
   // nowPlan is the plan from Users and toPlan is from here.
   //
   calcUpgrade(nowPlan, toPlan) {
      console.info("calcUpgrade:nowPlan:", nowPlan, " toPlan:", toPlan);

      const diff_days    = Util.diffDays(nowPlan.expires_on, Util.isoNow());
      const unused_value = (nowPlan.ppd) ? diff_days * nowPlan.ppd : 0;
      const days_to_add  = (toPlan.ppd)  ? Math.trunc((unused_value / toPlan.ppd) + 365) : 0;

      console.info(`calcUpgrade:diff_days:${diff_days} unused_value:${unused_value} days_to_add:${days_to_add}`);

      return days_to_add;

   }// calcUpgrade


   // Add time to lower plan (end date changes). No refund.
   // Return days to add to expires_on.
   //
   // nowPlan is the plan from Users and toPlan is from here.
   //
   calcDowngrade(nowPlan, toPlan) {
      console.info("calcDowngrade:nowPlan:", nowPlan, " toPlan:", toPlan);

      const diff_days    = Util.diffDays(nowPlan.expires_on, Util.isoNow());
      const unused_value = (nowPlan.ppd) ? diff_days * nowPlan.ppd : 0;
      const days_to_add  = (toPlan.ppd)  ? Math.trunc(unused_value / toPlan.ppd) : 0;

      console.info(`calcDowngrade:diff_days:${diff_days} unused_value:${unused_value} days_to_add:${days_to_add}`);

      return days_to_add;

   }// calcDowndrade


   // Calculate a new plan pricing schedule based on the current plan.
   //
   // currentPlan is the plan from User.
   //
   calcNewPlanSchedule(currentPlan, bookCnt = 0, isExpired = false, hourlyCnt = 0, overridePrice = 0) {
      console.info(`calcNewPlanSchedule:currentPlan:${currentPlan} bookCnt:${bookCnt} isExpired:${isExpired} hourlyCnt:${hourlyCnt} overridePrice:${overridePrice}`); 

      function find_problems(plan) {
  
         if (bookCnt > plan.qty) {
            const subject     = (bookCnt > 1) ? "books" : "book";
            const del_qty     = bookCnt - plan.qty;
            const del_subject = (del_qty > 1) ? "books" : "book";

            plan.direction = "problem";
            plan.problem = `This plan is unavailable because you have ${bookCnt} ${subject}. This plan supports ${plan.qty}. Delete ${del_qty} ${del_subject} to select this plan.`;
         }

         if (hourlyCnt > plan.hourly_qty) {
            const del_qty     = hourlyCnt - plan.hourly_qty;
            const del_subject = (del_qty > 1) ? "books" : "book";
            const subject     = (hourlyCnt > 1) ? "books" : "book";

            plan.direction = "problem";
            plan.problem = `This plan is unavailable because you have ${hourlyCnt} hourly ${subject}. This plan supports ${plan.hourly_qty}. Delete ${del_qty} hourly ${del_subject} to select this plan.`;
         }
      }

      // We're going to alter the plans so make a copy.
      let plans = Util.copy(this.plans); 

      // Expired is like buying a new plan, but you already have books.
      if (isExpired) {

         // Free plan doesn't have to pay with paypal.
         plans[0].direction = "downgrading";

         for (let i = 0; i < plans.length; i++) {
            plans[i].days_added = 0; 
            plans[i].direction = "upgrading";
            find_problems(plans[i]);
         }

         return plans;

      }// isExpired

      const plan = this.get(currentPlan.type); 

      if (currentPlan.type != "free") {
         plans[0].notice = "Selecting the free plan forfeits any prior payments or unused subscription.";
      }

      for (let i = 0; i < plan.idx; i++) {

         plans[i].days_added = this.calcDowngrade(currentPlan, plans[i]);
         plans[i].direction = "downgrading";
        
         if (overridePrice) {
            console.info(`calcNewPlanSchedule: overriding with price ${overridePrice}`);
            plans[i].price = overridePrice; 
         }

         find_problems(plans[i]);
      }

      // You can't select your current plan.
      plans[plan.idx].direction = "disabled";

      for (let i = plan.idx+1; i < plans.length; i++) {

         plans[i].days_added = this.calcUpgrade(currentPlan, plans[i]);
         plans[i].direction = "upgrading";

         if (overridePrice) {
            console.info(`calcNewPlanSchedule: overriding with price ${overridePrice}`);
            plans[i].price = overridePrice; 
         }

         find_problems(plans[i]);
      }

      return plans;

   }// calcNewPlanSchedule

}// Plans

module.exports = Plans;
