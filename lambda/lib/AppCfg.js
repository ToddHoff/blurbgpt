const https = require("https");
const Util  = require("./Util");

class AppCfg  {

   constructor(opts = {}) {

      this.opts = opts;
      this.env  = opts.env || process.env.BSR_ENV || 'test';

      this.setLogLevels();

      this.admin = {
         tz              : "America/Los_Angeles",
         email           : "toddhoffious@gmail.com",
         list_from_email : "info@bestsellersrank.me",
      }

      this.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

      this.paypal = {
         override_price : 0
      }

      this.proxies = {
         scraper_url    : "http://api.scraperapi.com?api_key=899da44789e6f09cb0c345b96c4f67a9",
         scraper_apikey : '899da44789e6f09cb0c345b96c4f67a9'
      }

      this.amazon = {
         region       : 'us-east-1'
      }

      if (this.env === "test") {
         this.amazon.worker_queue  = "https://sqs.us-east-1.amazonaws.com/617644363390/test-worker-queue";
         this.amazon.scrape_queue  = "https://sqs.us-east-1.amazonaws.com/617644363390/testScrapeQueue";
         this.amazon.scrape_lambda = "testScrape";
         this.amazon.users_table   = "test-users";
         this.amazon.splits_table  = "test-splits";
         this.amazon.stats_table   = "test-stats";
         this.admin.home_url       = "http://test.bestsellersrank.me";
      }
      else {
         this.amazon.worker_queue  = "https://sqs.us-east-1.amazonaws.com/617644363390/prod-worker-queue";
         this.amazon.scrape_queue  = "https://sqs.us-east-1.amazonaws.com/617644363390/prodScrapeQueue";
         this.amazon.scrape_lambda = "prodScrape";
         this.amazon.users_table   = "prod-users";
         this.amazon.splits_table  = "prod-splits";
         this.amazon.stats_table   = "prod-stats";
         this.admin.home_url       = "https://bestsellersrank.me";
      }

      console.debug = (...args) => {
         this.log_levels["OFF"] != true && this.log_levels["DEBUG"] && console.log.apply(console, args);
      }

      console.info = (...args) => {
         this.log_levels["OFF"] != true && this.log_levels["INFO"] && console.log.apply(console, args);
      }

      console.trace = (...args) => {
         this.log_levels["OFF"] != true && this.log_levels["TRACE"] && console.log.apply(console, args);
      }

      console.error = (...args) => {
         args.unshift("[ERROR] ");
         console.log.apply(console, args)
      }

      console.notify = (...args) => {
         args.unshift("[NOTIFY] ");
         console.log.apply(console, args)
      }

      console.alert = (...args) => {
         args.unshift("[ALERT] ");
         console.log.apply(console, args)
      }

      console.metric = (id, ...args) =>  { 
         args.unshift(id);
         console.log.apply(console, args)
      }

      this.AWS = require('aws-sdk');

      const agent = new https.Agent({
         keepAlive: true
      })

      this.AWS.config.update({
         region: this.amazon.region,
         httpOptions: { 
            agent 
         }
      })

      this.S3  = new this.AWS.S3();
      this.SES = new this.AWS.SES();
      this.SQS = new this.AWS.SQS();

      this.DDB = new this.AWS.DynamoDB.DocumentClient({ 
         convertEmptyValues: true, 
         credentials: this.AWS.config.credentials 
      });

      console.log("env        : ", this.env);
      console.log("log_levels : ", this.log_levels);
      console.log("paypal     : ", JSON.stringify(this.paypal));
      console.log("amazon     : ", JSON.stringify(this.amazon));
      console.log("proxies    : ", JSON.stringify(this.proxies));
      console.log("admin      : ", JSON.stringify(this.admin));
      console.log("tz         : ", this.tz);

   }// constructor

   isTest()   { return this.env == "test" }
   isProd()   { return this.env == "prod" }
   isEnv(env) { return this.env == env; }

   setLogLevels() {

      this.log_levels = {
         "OFF"   : process.env.OFF   || false,
         "DEBUG" : process.env.DEBUG || false,
         "INFO"  : process.env.INFO  || true,
         "TRACE" : process.env.TRACE || true
      }

      if (this.opts.log_levels) {
         this.log_levels = Util.merge(this.log_levels, this.opts.log_levels);
      }

   }// setLogLevels

}// AppCfg

module.exports = AppCfg;
