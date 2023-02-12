const Util = require("./Util");

//
// nick: "explain",
// owner: "yours",
// period: "hourly",
// source: "amazon",
// type: "product",
// subtype: "book",
// url: "https://www.amazon.com/dp/B0765C4SNR",
// verify_msg: "Your book was verified and added.",
// verify_status: "verified"
// verify_on: date
// last_reported:
// last_stats:
//
class ProductDto {

   constructor(cfg, record) {
      console.info("ProductDto:constructor:record:" + JSON.stringify(record));

      this.cfg      = cfg;
      this.is_dirty = false;
      this.data     = record || {};

      this.data.type = "product";
   }

   key() {
      return {
         'pk': `USER#${this.data.user_id}`,
         'sk': `PRODUCT#${this.data.url}`
      }
   }

   static gs1(period, userId = "") {
      return {
         'gs1pk': `PERIOD#${period}`,
         'gs1sk': `USER#${userId}`
      }
   }

   async get() {
      console.info("ProductDto:get:");

      const params = {
         TableName: this.cfg.amazon.users_table,
         Key: { 
            "pk": this.key()['pk'],
            "sk": this.key()['sk']
         }
      }

      const data = await this.cfg.DDB.get(params).promise();

      if (data.Count <= 0) return null;

      return this.data = data.Item;

   }// get

   // You cannot use the sort key because we want to find ALL products for a period
   // from ALL users.
   static async applyAllByPeriod(cfg, period, cb) { 
      console.info(`applyAllByPeriod:${period}`);

      const params = {
         TableName: cfg.amazon.users_table, 
         IndexName: 'gs1-index',
         KeyConditionExpression: '#gs1pk = :gs1pk',
         ExpressionAttributeNames: {
            '#gs1pk': 'gs1pk'
         },
         ExpressionAttributeValues: {
            ':gs1pk': this.gs1(period)['gs1pk']
         },
         ScanIndexForward: false
      };

      let items;
      do {
         items = await cfg.DDB.query(params).promise();
         items.Items.forEach((item) => cb(cfg, item));

         params.ExclusiveStartKey = items.LastEvaluatedKey;

      } while (typeof items.LastEvaluatedKey != "undefined");


   }// applyAllByPeriod


   static async getAllByPeriod(cfg, period) { 
      console.info(`getAllByPeriod:${period}`);

      const params = {
         TableName: cfg.amazon.users_table, 
         IndexName: 'gs1-index',
         KeyConditionExpression: '#gs1pk = :gs1pk',
         ExpressionAttributeNames: {
            '#gs1pk': 'gs1pk'
         },
         ExpressionAttributeValues: {
            ':gs1pk': this.gs1(period)['gs1pk']
         },
         ScanIndexForward: false
      };

      let items;
      let results = [];

      do {
         items = await cfg.DDB.query(params).promise();

         items.Items.forEach((item) => results.push(item));

         params.ExclusiveStartKey = items.LastEvaluatedKey;

      } while (typeof items.LastEvaluatedKey != "undefined");

      return results;

   }// getAllByPeriod


   static async getByPeriod(cfg, params) { 
      console.info(`getByPeriod:${params.scope}`);

      if (params.hasOwnProperty("ExclusiveStartKey") && typeof params.ExclusiveStartKey == "undefined")
         return null; 

      if (! params.hasOwnProperty("TableName")) {

         params.TableName = cfg.amazon.users_table;
         params.IndexName = 'gs1-index';
         params.KeyConditionExpression = '#gs1pk = :gs1pk';
         params.ExpressionAttributeNames = { '#gs1pk': 'gs1pk' };
         params.ExpressionAttributeValues = { ':gs1pk': this.gs1(params.scope)['gs1pk'] };
         params.ScanIndexForward = false;
      }

      params.results = [];

      let items = await cfg.DDB.query(params).promise();

      params.ExclusiveStartKey = items.LastEvaluatedKey;

      items.Items.forEach((item) => params.results.push(item));

      return params;

   }// getByPeriod


   async remove() {
      console.info("ProductDto:remove:");

      var params = {
         TableName: this.cfg.amazon.users_table,
         Key: { 
            "pk": this.key()['pk'],
            "sk": this.key()['sk']
         }
      }

      await this.cfg.DDB.delete(params).promise();

   }// remove


   urlUpdate(newUrl) {
      this.data.url = newUrl;
      this.is_dirty = true;
   }

   verifyUpdate(status, msg) {
      this.data.verify_status = status;
      this.data.verify_msg = msg;
      this.data.verify_on = Util.isoNow();
      this.is_dirty = true;
   }

   statsUpdate(stats) {
      console.log("statsUpdate:");

      this.is_dirty = true;

      // Keep the last stats gathered so they can be displayed.
      this.data.last_stats = stats;

      // If a series was detected latch it into the main product data.
      // Don't overwrite with nothing if for some reason the series 
      // data can't be extracted from the page.
      if (stats.series) {
         this.data.series = Util.copy(stats.series);
      }

      // Remember a history of categories. 
      if (!this.data.hasOwnProperty("metric_history")) {
         console.log("statsUpdate: init");
         this.data.metric_history = {};
      }

      const self = this;

      function summary(metric, value, type) {
         console.log("statsUpdate: metric:", metric, " value:", value, " type:", type);

         const existing = self.data.metric_history[metric];
         if (existing) {
            console.log("statsUpdate: existing");

            if (value === 0) return; // ignore zero values as usually a scrape error

            const updated = Util.copy(existing);

            updated.count++;
            updated.mean = Util.movingAve(updated.mean, value, updated.count);
            updated.max  = (updated.max < value) ? value : updated.max; 
            updated.min  = (value < updated.min || updated.min == 0) ? value : updated.min; 
            updated.type = type;

            self.data.metric_history[metric] = updated;
         }
         else {
            console.log("statsUpdate: new");

            self.data.metric_history[metric] = { mean: value, count: 1, min: value, max: value, type: type };
         }
      }

      summary("Sales Rank",     Number(stats.sales_rank), "metric"); 
      summary("Price",          Number(stats.price),      "metric"); 
      summary("Review Average", Number(stats.review_ave), "metric"); 
      summary("Review Count",   Number(stats.review_cnt), "metric"); 

      for (const rank of stats.ranks) {
         summary(rank.category, Number(rank.rank), "category"); 
      }

      console.log("METRICS:", this.data.metric_history);

   }// statsUpdate

   async create() {
      console.info("ProductDto:create:");
      await this.update();
   }

   async update() {
      console.info("ProductDto:update:");

      this.data.pk    = this.key()['pk']; 
      this.data.sk    = this.key()['sk']; 
      this.data.gs1pk = ProductDto.gs1(this.data.period, this.data.user_id)['gs1pk']; 
      this.data.gs1sk = ProductDto.gs1(this.data.period, this.data.user_id)['gs1sk']; 

      if (!this.data.hasOwnProperty("tags")) {
         this.data.tags = {};
      }

      const params = {
         TableName : this.cfg.amazon.users_table,
         Item      : this.data, 
      }

      await this.cfg.DDB.put(params).promise();

      this.is_dirty = false;
   }

   async markReportSent() {
      console.info("markReportSent:");

      const params = {
         TableName : this.cfg.amazon.users_table,
         Key: { 
            "pk": this.key()['pk'],
            "sk": this.key()['sk']
         },
         UpdateExpression: "set last_reported = :r",
         ExpressionAttributeValues:{
            ":r": Util.isoNow()
         }
      }

      await this.cfg.DDB.update(params).promise();
   }

   async markVerifyStatus(status, msg) {
      console.info(`markVerifyStatus:status:${status}`);

      const params = {
         TableName : this.cfg.amazon.users_table,
         Key: { 
            "pk": this.key()['pk'],
            "sk": this.key()['sk']
         },
         UpdateExpression: "set verify_status = :s, verify_msg = :m, verify_on = :o",
         ExpressionAttributeValues:{
            ":s": status,
            ":m": msg,
            ":o": Util.isoNow()
         }
      }

      await this.cfg.DDB.update(params).promise();
   }

}// ProductDto


module.exports = ProductDto;
