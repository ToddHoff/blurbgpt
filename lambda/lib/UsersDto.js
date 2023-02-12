const moment         = require("moment-timezone");
const url            = require("url");

const Status         = require("./Status");
const Util           = require("./Util");
const SendEmail      = require("./SendEmail");
const Plans          = require("./Plans");
const ProductDto     = require('./ProductDto');
const PaypalOrderDto = require('./PaypalOrderDto');
const EventDto       = require("./EventDto");
const SplitsDto      = require("./SplitsDto");
const Queue          = require("./Queue");

//
//  status: "up",
//  version: "1",
//  created_at: "2020-06-07T17:47:24.904Z",
//  email: "toddhoffious@gmail.com",
//  first_name: "John",
//  last_name: "Hoff",
//  plan: 
//  plan_history: []  
//  products: [] - virtual
//
class UsersDto {

   constructor(cfg, record = null) {
      console.info("UsersDto:constructor:record:" + JSON.stringify(record));

      this.cfg      = cfg;
      this.is_dirty = false;
      this.plans    = new Plans();
      this.data     = Util.merge({
                            created_on   : Util.isoNow(),
                            email        : undefined,
                            version      : "1",
                            first_name   : "",
                            last_name    : "",
                            tags         : {}, 
                            subscription : "yes",
                            plan         : Plans.DEFAULT_FREE_PLAN, 
                            plan_history : [],
                            products     : [], // objects not stored here
                            events       : []
                         },
                         record);

      this.data.type = "user";

   }// constructor


   key() {
      return {
         'pk': `USER#${this.data.email}`,
         'sk': `USER#${this.data.email}`
      }
    }


   async create() {
      await this.update();
   }

   async update() {
      console.info("UsersDto:update:");

      this.data.pk = this.key()['pk']; 
      this.data.sk = this.key()['sk']; 

      // Don't save the products list. They are kept as separate records.
      const products = this.data.products;
      delete this.data.products;

      const params = {
         TableName: this.cfg.amazon.users_table,
         Item: this.data, 
      }

      this.data.products = products;

      await this.cfg.DDB.put(params).promise();

      this.is_dirty = false;
   }


   async getJustUser() {
      console.info("UsersDto:getJustUser:email:" + this.data.email);

      this.data.pk = this.key()['pk']; 

      const params = {
         TableName: this.cfg.amazon.users_table,
         Key: { 
            "pk": this.key()['pk'],
            "sk": this.key()['sk']
         }
      }

      const data = await this.cfg.DDB.get(params).promise();
      console.info("UsersDto:getJustUser:", data);

      if (data.Count <= 0) return null;

      this.data = data.Item;

      return this.elaborate();

   }// getJustUser


   async get() {
      console.info("UsersDto:get:email:" + this.data.email);

      this.data.pk = this.key()['pk']; 

      const data = await this.cfg.DDB.query({

         TableName: this.cfg.amazon.users_table,
         KeyConditionExpression: '#pk = :pk',
         ExpressionAttributeNames: {
           '#pk': 'pk'
         },
         ExpressionAttributeValues: {
             ':pk': this.key()['pk']
         },
         ScanIndexForward: false

      }).promise()

      console.debug("UsersDto:get:data:" + JSON.stringify(data), null, 2);

      if (data.Count <= 0) return null;

      this.data = data.Items.shift();

      this.data.products = data.Items.filter(item => item.type === "product");
      this.data.events   = data.Items.filter(item => item.type === "event");

      return this.elaborate();

   }// get


   async remove() {
      console.info("UsersDto:remove:");

      // A little nervous because this is not in a transaction.

      // Delete all the associated products
      await Promise.all(
         this.data.products.map(async (item) => {
            const dto = new ProductDto(this.cfg, item);   
            await dto.remove();
         })
      )

      // Delete all the events
      await this.purgeEvents();

      // Delete all the splits
      const splits = new SplitsDto(this.cfg, { user_id: this.data.email });
      await splits.get();
      await splits.purge();

      // Once all the associate records for the user have been deleted delete
      // the main user record itself.
      const params = {
         TableName: this.cfg.amazon.users_table,
         Key: { 
            "pk": this.key()['pk'],
            "sk": this.key()['sk']
         }
      }

      await this.cfg.DDB.delete(params).promise();

   }// remove

   // The product is added asyncronously. It can sometimes take 40 seconds to scrape 
   // and validate the product. To get the result you'll have to poll, get the user 
   // object, and look for the event that says the add failed or succeeded.
   //
   async addProduct(product) {
      console.info(`UsersDto:addProduct:url:${product.url}`);

      const queue = new Queue(this.cfg, this.cfg.amazon.worker_queue);

      product.user_id = this.data.email; // associate product with a user 
      product.url     = Util.normalizeUrl(product.url); // cleanup whatever the user sent over

      await queue.push({
         cmd    : "add-product",
         values : product 
      });

   }// addProduct
   
   async updateProduct(product) {
      console.info(`UsersDto:updateProduct:url:${product.url}`);

      product.url = Util.normalizeUrl(product.url); 
      console.info("updateProduct:normalized_url:", product.url);

      const idx = this.data.products.findIndex(e => e.url == product.url);
      if (idx == -1) {
         throw new Status("ERR_PRODUCT_NOT_FOUND", "You can't update a book that doesn't exist.");
      }

      const found = this.data.products[idx];

      const hourly_cnt = this.getHourlyCnt();
      console.info(`updateProduct:hourly_cnt:${hourly_cnt} product count:${this.data.products.length} plan qty:${this.data.plan.qty}`);

      // If an existing product changes to an hourly period make sure we have the room.
      if (found.period != "hourly" && product.period == "hourly" && hourly_cnt >= this.data.plan.hourly_qty) {
         throw new Status("ERR_PRODUCT_LIMIT", "You've reached your hourly limit.");
      }

      product.user_id = this.data.email; // associate the product with this user

      // Even though the product is not part of the user record we fold it into the record so when the
      // user data is returned back to the client it will appear like that data was updated without
      // having to get the user again.
      // 
      this.data.products[idx] = Object.assign(this.data.products[idx], product);

      const dto = new ProductDto(this.cfg, this.data.products[idx]);
      await dto.update();
   
      this.data.products[idx] = Object.assign(this.data.products[idx], product);

   }// updateProduct


   async switchToNewPlan(request) {
      console.info("switchToNewPlan:request:", request.type);

      const new_plan = this.plans.get(request.type);
      if (!new_plan) throw new Status("ERR_BAD_REQUEST", `Invalid plan ${request.type}`);

      console.info("switchToNewPlan:new_plan:", new_plan);

      // Save the old plan so we can see the plan history. Probably should be in its own table.
      this.data.plan_history.push(this.data.plan);

      // Start the new plan. We assume the api didn't lie about the pay event. That just makes it simpler.
      // The webhook will validate the purchase so we can eventually shutdown rogue accounts.
      // 
      const inprogress_plan = {
        type       : request.type,
        order_id   : request.order_id,
        payer_id   : request.payer_id,
        capture_id : request.capture_id,
        started_on : Util.isoNow(),
        expires_on : Util.isoYearNow(),
        title      : new_plan.title,      // used for UI
        price      : new_plan.price,      // used for UI
        ppd        : new_plan.ppd,        // used for upgrade/downgrade calc
        qty        : new_plan.qty,        // used for upgrade/downgrade
        hourly_qty : new_plan.hourly_qty  // used for UI
      }

      // Handle plan state transitions.
      //
      if (this.isExpired()) {
         this.expiring(inprogress_plan, new_plan);
      }
      else if (this.data.plan.type == "free" || new_plan.type == "free") {
         // Moving to a free plan means inprogress_plan is valid.
      }
      else if (new_plan.qty < this.data.plan.qty) {
         this.downgrading(inprogress_plan, new_plan);
      }
      else if (new_plan.qty > this.data.plan.qty) {
         this.upgrading(inprogress_plan, new_plan);
      }
      else {
         // For other cases, when the quantities are the same, which shouldn't happen, the inprogress_plan should already be valid.
      }

      // Switch to the new plan.
      this.data.plan = inprogress_plan;

      // Don't let an error sending
      try {
         // Create a record that will be retrieved by the paypal web hook to complete the order.
         const paypal_dto = new PaypalOrderDto(this.cfg, { 
                               user_id      : this.data.email,
                               plan_type    : request.type,
                               order_id     : request.order_id,
                               payer_id     : request.payer_id,
                               capture_id   : request.capture_id,
                               price        : new_plan.price,
                               order_status : "submitted",
                               created_on   : Util.isoNow()
                            })
         await paypal_dto.create();

         // Tell the user about their new plan.
         const message = `
            Hi ${Util.cget(this.data, 'first_name', '')},
            <P>
            Just letting you know your new Best Sellers Rank plan is now the <i>${this.data.plan.title}</i>. 
            It expires on ${Util.isoToDate(this.data.plan.expires_on, {tz:this.cfg.tz})}.
            <P>
            Thanks for using Best Sellers Rank!
          `;

         await SendEmail(this.cfg, this.cfg.admin.list_from_email, this.data.email, "Best Sellers Rank: Plan Change Notice", message);

      } catch (error) {
         console.error("switchToNewPlan:email:", error);
      }

      this.is_dirty = true; // make sure our changes get updated

   }// switchToNewPlan


   // This should be handled on the client side, but if there are more
   // books than in the new plan we truncate. Seems extreme, but as this
   // shouldn't happen, something fishy is going on.
   //
   truncatePlan(newPlan) {

      if (this.data.products.length > newPlan.qty) {
         this.data.products = this.data.products.slice(0, newPlan.qty);
         console.info("truncatePlan: truncating books because new plan has fewer books.");
      }

      // We just remove all the hourly because that's safest.
      const hourly_cnt = this.getHourlyCnt();
      if (hourly_cnt > newPlan.hourly_qty) {
         this.data.products = this.data.products.filter((value, index, arr) => value.period != "hourly");
         console.info("truncatePlan: truncating hourly because new plan has fewer hourly.");
      }
   }

   expiring(inprogressPlan, newPlan) {
      console.info(`UsersDto:expiring: from:${this.data.plan.type} to:${newPlan.type}`);

      this.truncatePlan(newPlan);

      // All expirations are alike in that they are new plans with a year.
      inprogressPlan.expires_on = moment().add(365, 'days').toISOString();

      // Record info about the expiration.
      inprogressPlan.expired = { 
         prev_type        : this.data.plan.type, 
         prev_expires_on  : this.data.plan.expires_on,
         days_to_add      : 365, 
         new_expires_on   : inprogressPlan.expires_on, 
         ts               : Util.isoNow() 
      };

   }// expiring


   downgrading(inprogressPlan, newPlan) {
      console.info(`UsersDto:downgrading: from:${this.data.plan.type} to:${newPlan.type}`);

      this.truncatePlan(newPlan);

      // We need to credit a number of days based on the current value.
      const days_to_add = this.plans.calcDowngrade(this.data.plan, newPlan);

      inprogressPlan.expires_on = moment().add(days_to_add, 'days').toISOString();

      console.info(`UsersDto:downgrading: days_to_add:${days_to_add} new_date:${inprogressPlan.expires_on}`);

      // Record info about the downgrade.
      inprogressPlan.downgraded = { 
         prev_type        : this.data.plan.type, 
         prev_expires_on  : this.data.plan.expires_on,
         days_to_add      : days_to_add, 
         new_expires_on   : inprogressPlan.expires_on, 
         ts               : Util.isoNow() 
      };

   }// downgrading


   upgrading(inprogressPlan, newPlan) {
      console.info(`UsersDto:upgrading: from:${this.data.plan.type} to:${newPlan.type}`);

      // We extend the subscription for the unused portion of the lower plan.
      const days_to_add = this.plans.calcUpgrade(this.data.plan, newPlan);

      inprogressPlan.expires_on = moment().add(days_to_add, 'days').toISOString();

      console.info(`UsersDto:upgrading: days_to_add:${days_to_add} new_date:${inprogressPlan.expires_on}`);

      this.data.plan.upgrading = { 
         prev_type       : this.data.plan.type, 
         prev_expires_on : this.data.plan.expires_on,
         new_expires_on  : inprogressPlan.expires_on,
         days_to_add     : days_to_add, 
         ts              : Util.isoNow() 
      };

   }// upgrading


   findProduct(url) {
      return this.data.products.find(e => e.url == url);
   }


   async deleteProduct(url) {
      console.info("deleteProduct:url:", url);

      const product = this.findProduct(url);

      const dto = new ProductDto(this.cfg, product);   
      await dto.remove();

      this.data.products = this.data.products.filter(value => value.url != url);
   }


   static async all(cfg, cb) {
      console.info("UsersDto:all");

      var params = {
         TableName: cfg.amazon.users_table
      }

      let items;
      do {
        items = await cfg.DDB.scan(params).promise();
        items.Items.forEach((item) => cb(cfg, item));
        params.ExclusiveStartKey = items.LastEvaluatedKey;

      } while (typeof items.LastEvaluatedKey != "undefined");

   }// all


   static async getAllInBatches(cfg, params) { 
      console.info(`getAllInBatches:`);

      if (params.hasOwnProperty("ExclusiveStartKey") && typeof params.ExclusiveStartKey == "undefined")
         return null; 


      if (! params.hasOwnProperty("TableName")) {

         params.TableName = cfg.amazon.users_table;
         params.ScanIndexForward = false;
      }

      params.results = [];

      let items = await cfg.DDB.scan(params).promise();

      params.ExclusiveStartKey = items.LastEvaluatedKey;

      params.results = items.Items.filter(item => item.type === "user");

      return params;

   }// getAllInBatches


   getHourlyCnt() {
      return this.data.products.filter((e) => { return e.period == "hourly"}).length;
   }

   // Queues up a request to delete the user.
   //
   async obliderate() {
      console.info(`UsersDto:obliderate:url:${this.data.email}`);

      const queue = new Queue(this.cfg, this.cfg.amazon.worker_queue);

      await queue.push({
         cmd    : "obliderate-user",
         values : { email: this.data.email }
      });

   }// obliderate


   fmtSafe() {

      this.elaborate(); // if anything has changed make sure derived data is updated

      const product_fields = [
                                "last_reported", "last_stats", "ranks",       "review_ave", "review_cnt",    "review_stars",  
                                "sales_rank",    "store_type", "title",       "nick",       "owner",         "period",
                                "url",           "user_id",    "verify_msg",  "verify_on",  "verify_status", "metric_history",
                                "series",        "tags:create_hash"
                             ]; 

      const plan_fields = ["type", "hourly_qty", "title", "qty"];


      return {
         first_name           : this.data.first_name,
         last_name            : this.data.last_name,
         email                : this.data.email,
         tags                 : this.data.tags,
         subscription         : this.data.subscription,
         subscription_expired : this.data.subscription_expired,
         products             : this.arrayProject(this.data.products, product_fields),
         events               : this.data.events,
         plan                 : this.objectProject(this.data.plan, plan_fields)
      }

   }// fmtSafe


   arrayProject(array, fields) {

      const selected = [];

      for (const row of array) {
         selected.push(this.objectProject(row, fields));
      }

      return selected;   

   }// arrayProject


   objectProject(object, fields) {

      const selected = {};

      for (const field of fields) {
         const parts = field.split(":"); 
         const fld   = parts[0];
         if (object.hasOwnProperty(fld)) {
            selected[fld] = object[fld];
         }
         else if (parts[1] && parts[1] === "create_hash") {
            selected[fld] = {};
         }
      }

      return selected;

   }// objectProject


   isExpired() {
      return this.daysBeforeExpires() < 0;
   }

   isSubscription() {
      return this.data.subscription == "yes";
   }

   daysBeforeExpires() {
      if (!this.data.hasOwnProperty("plan") || !this.data.plan.hasOwnProperty("expires_on")) return 0;

      const expires_on = moment(this.data.plan.expires_on);
      const now        = moment();

      return expires_on.diff(now, 'days');
   }

   elaborate() {
      this.data.subscription_expired = this.isExpired();
      return this.data;
   }

   async purgeEvents() {
      console.info("UsersDto:purgeEvents");

      for (const event of this.data.events) {
          const dto = new EventDto(this.cfg, event);
          await dto.remove();
      }
   }// purgeEvents


   // TODO: add more fields
   static validate(record) {

     if (record.subscription && (record.subscription != "yes" && record.subscription != "no")) {
        throw new Status("ERR_INVALID_DATA", `Subscription value of ${record.subscription} is invalid`); 
     } 

   }

}// UsersDto


module.exports = UsersDto;
