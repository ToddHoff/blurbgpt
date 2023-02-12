const moment = require("moment-timezone");
const fs     = require("fs");


// There's a logic to the naming convention.
// products/year=$year/id=$id/month=$month/day=$day/$fname"
// users/year=$year/user=$user/id=$id/month=$month/day=$day/$fname"
//
// year is next so we can put a whole year into glacier.
// user so we can see all a user's data
// id so we can look at data by book.
//
// A couple of things to keep in mind about S3:
// 1. It's flat. We put in / for us, S3 doesn't care, there's no such thing as a directory. 
//    Directories are in the client.
// 2. It's infinite. We can put any number of item in a "directory". 
// 3. The year=value style format is for Athena, so we can query stuff later.
//
class Vault {

   constructor(cfg) {
      console.info("Vault:constructor:");
   
      this.cfg = cfg;

      // There are separate buckets depending on the environment.
      this.bucket = `bestsellersrank-reportstore-${cfg.env}`;
   }

   encode(param) {
      if (!param) return param;

      param = param.replace(/\//g, "!");
      param = param.replace(/\-/g, "~");

      return param;

   }// encode

   // When user is null the key is formed for the products branch.
   // When user is set the key is formed for the users branch.
   //
   fmtKey(user, id, date, period, fname) {
      console.info(`Vault:fmtKey:user:${user} id:${id} fname:${fname}`);

      const year  = date.format("YYYY");
      const month = date.format("MM");
      const day   = date.format("DD");
      const hour  = (period == "hourly") ? date.format("HH") : "00";

      user  = this.encode(user);
      id    = this.encode(id);
      fname = this.encode(fname);

      const key = (user) ? `users/year=${year}/user=${user}/id=${id}/month=${month}/day=${day}/${hour}.${fname}`
                         : `products/year=${year}/id=${id}/month=${month}/day=${day}/${hour}.${fname}`;
      console.info(`fmtKey:${key}`);

      return key;

   }// fmtKey


   async get(user, id, date, period, fname) {
      console.info("Vault:get:");

      try {
         const params = {Bucket: this.bucket, Key: this.fmtKey(user, id, date, period, fname)};
         console.info("Vault:get:params:", params);

         const data = await this.cfg.S3.getObject(params).promise();;

         const object_data = data.Body.toString('utf-8');

         return object_data;
      } 
      catch(error) {
         console.debug("Vault:get:", error);
         return null;
      }

   }// get

   async getByKey(key) {
      console.info("Vault:getByKey:", key);

      try {
         const params = {Bucket: this.bucket, Key: key};
         console.info("Vault:getByKey:params:", params);

         const data = await this.cfg.S3.getObject(params).promise();;

         const object_data = data.Body.toString('utf-8');

         return object_data;
      } 
      catch(error) {
         console.debug("Vault:get:", error);
         return null;
      }

   }// getByKey

   async create(user, id, date, period, fname, content) {
      console.info("Vault:create:");

      const params = {Bucket: this.bucket, Key: this.fmtKey(user, id, date, period, fname), Body: content};

      const data = await this.cfg.S3.upload(params).promise();;
      console.info(`File uploaded successfully. ${data.Location}`);
   }

   generatePresignedUrl(user, id, date, period, fname) {
      console.info("Vault:generatePresignedUrl:");

      try {
         const params = {Bucket: this.bucket, Key: this.fmtKey(user, id, date, period, fname)};
         console.info("Vault:generatePresignedUrl:params:", params);

         return this.cfg.S3.getSignedUrl("getObject", params);
      } 
      catch(error) {
         console.info("Vault:generatePresignedUrl:error:", error);
         return null;
      }

   }// generatePresignedUrl


   async isExists(user, id, date, period, fname) {
      console.info("Vault:isExists:");

      try {
         const params = {Bucket: this.bucket, Key: this.fmtKey(user, id, date, period, fname)};
         console.info("Vault:isExists:params:", params);

         await this.cfg.S3.headObject(params).promise();;

         return true;
      } 
      catch(error) {
         console.debug("Vault:get:", error);
         return false;
      }

   }// isExists


   async deleteUser(user) {
      console.info(`deleteUser:${user}`);

      // TODO: loop through all years. We only delete the current years. The other years
      // should be archived.

      const date = moment.utc();
      const year = date.format("YYYY");
      user       = this.encode(user);

      const key = `users/year=${year}/user=${user}/`;

      return await this.emptyDirectory(key);

   }// deleteUser


   // await emptyDirectory('images/')
   //
   async emptyDirectory(dir) {
      console.log(`emptyDirectory:dir:${dir}`);

      const listParams = {
         Bucket: this.bucket,
         Prefix: dir
      };

      const listedObjects = await this.cfg.S3.listObjectsV2(listParams).promise();

      if (listedObjects.Contents.length === 0) return;

      const deleteParams = {
         Bucket: this.bucket,
         Delete: { Objects: [] }
      };

      listedObjects.Contents.forEach(({ Key }) => {
         deleteParams.Delete.Objects.push({ Key });
      });

      await this.cfg.S3.deleteObjects(deleteParams).promise();

      if (listedObjects.IsTruncated) await this.emptyDirectory(bucket, dir);

   }// emptyDirectory


   async walkDirectory(dir, callback) {
      console.log(`walkDirectory:dir:${dir}`);

      const listParams = {
         Bucket: this.bucket,
         Prefix: dir
      };

      const listedObjects = await this.cfg.S3.listObjectsV2(listParams).promise();

      if (listedObjects.Contents.length === 0) return;

      listedObjects.Contents.forEach(({ Key }) => {
         callback(this.bucket, dir, Key); 
      });

      if (listedObjects.IsTruncated) await this.walkDirectory(this.bucket, dir);

   }// walkDirectory


}// Vault

module.exports = Vault;
