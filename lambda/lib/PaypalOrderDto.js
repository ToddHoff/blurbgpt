const Status      = require("./Status");
const Util        = require("./Util");

class PaypalOrderDto {

   constructor(cfg, record = {}) {
      console.info("PaypalOrderDto:constructor:record:" + JSON.stringify(record));

      this.cfg  = cfg;
      this.data = record;

   }// constructor


   key() {
      return {
         'pk': `PPORDER#${this.data.order_id}`,
         'sk': `PPORDER#${this.data.order_id}`
      }
   }

   static gs2(status) {
      return {
         'gs2pk': `ORDER_STATUS#${status}`,
      }
   }

   async update() {
      await this.create();
   }

   async create() {
      console.info(`PaypalOrderDto:start:`);

      this.data.pk = this.key()['pk']; 
      this.data.sk = this.key()['sk']; 

      this.data.gs2pk = PaypalOrderDto.gs2(this.data.order_status)['gs2pk']; 

      const params = {
         TableName: this.cfg.amazon.users_table,
         Item: this.data, 
      }

      await this.cfg.DDB.put(params).promise();

   }// create


   async get() {
      console.info(`PaypalOrderDto:get:${this.data.order_id}`);

      const params = {
         TableName: this.cfg.amazon.users_table,
         Key: { 
            "pk": this.key()['pk'], 
            "sk": this.key()['sk'] 
         }
      }

      const data = await this.cfg.DDB.get(params).promise();
      console.info("PaypalOderDto:get", data);

      if (! data.hasOwnProperty("Item")) return null;

      this.data = data.Item;

      return this.data;

   }// get


   async remove() {
      console.info(`PaypalOrderDto:remove:${this.data.order_id}`);

      const params = {
         TableName: this.cfg.amazon.users_table,
         Key: { 
            "pk": this.key()['pk'], 
            "sk": this.key()['sk'] 
         }
      }

      await this.cfg.DDB.delete(params).promise();

   }// remove


   verified() {
      this.order_status = "verified";
      this.data.verified_on = Util.isoNow();
   }


   failed(reason) {
      this.order_status = "failed";
      this.data.failed_on     = Util.isoNow();
      this.data.failed_reason = reason;
   }

   static async applyAllByStatus(cfg, status, cb) { 
      console.info(`applyAllByStatus:${status}`);

      const params = {
         TableName: cfg.amazon.users_table, 
         IndexName: 'gs2-index',
         KeyConditionExpression: '#gs2pk = :gs2pk',
         ExpressionAttributeNames: {
            '#gs2pk': 'gs2pk'
         },
         ExpressionAttributeValues: {
            ':gs2pk': this.gs2(status)['gs2pk']
         },
         ScanIndexForward: false
      };

      let items;
      do {
         items = await cfg.DDB.query(params).promise();
         items.Items.forEach((item) => cb(cfg, item));

         params.ExclusiveStartKey = items.LastEvaluatedKey;

      } while (typeof items.LastEvaluatedKey != "undefined");


   }// applyAllByStatus

}// PaypalOrderDto


module.exports = PaypalOrderDto;
