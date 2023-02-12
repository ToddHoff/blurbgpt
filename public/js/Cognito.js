
class Cognito {

   constructor(cfg) {
      console.log("Cognito:");

      this.init();

      this.cfg = cfg;

      this.pool_data = { 
         UserPoolId : this.cfg.amazon.user_pool_id,
         ClientId   : this.cfg.amazon.client_id 
      };

      this.user_pool = new AmazonCognitoIdentity.CognitoUserPool(this.pool_data);

      this.last_refresh = new Date().getTime();

   }// constructor


   isLoggedIn() {
      return this.user_pool.getCurrentUser() != null;
   }


   async login(email, password) {
      console.log("Cognito:login: email:" + email + " password:" + password);

      this.init();

      this.email = email;

      var authenticate_data = {
         Username : email,
         Password : password 
      };

      var authentication_details = new AmazonCognitoIdentity.AuthenticationDetails(authenticate_data);

      var user_data = {
         Username : email,
         Pool     : this.user_pool
      };

      var cognito_user = new AmazonCognitoIdentity.CognitoUser(user_data);

      var self = this;

      return new Promise((resolve, reject) => {

         cognito_user.authenticateUser(authentication_details, {

            onSuccess: function (result) {
               console.log("Cognito:login:success:result:", result);

               self.access_token  = result.getAccessToken().getJwtToken();
               self.refresh_token = result.getRefreshToken().getToken();
               self.id_token      = result.getIdToken().getJwtToken();
               self.cognito_user  = cognito_user;

               resolve(null);
            },

            onFailure: function(error) {
               console.log("Cognito:login:error:", error);
               reject(error);
            }
         })
      })

   }// login


   async refresh() {

      const ts = new Date().getTime();
      const delta = 10 * 60 * 1000; // 10 minutes

      if (ts < this.last_refresh + delta) {
         return Promise.resolve(true);
      }

      console.log("Refreshing...");

      const self = this;

      return new Promise((resolve, reject) => {

         try {

            const session = self.cognito_user.getSignInUserSession(); 
            self.cognito_user.refreshSession(session.getRefreshToken(), (error, session) => {

               if (error) {
                  console.log("refresh:error:", error);
                  return resolve(false);
               } 

               self.access_token = session.getAccessToken().getJwtToken();
               self.refresh_token = session.getRefreshToken().getToken();
               self.id_token = session.getIdToken().getJwtToken();

               console.log("REFRESH SUCCESSFULL");

               self.last_refresh = new Date().toString();

               return resolve(true);
            });

         } catch (e) {
            console.log("refresh:e:", e);
            return resolve(false);
         }

      })// promise

   }// refresh


   async relogin() {
      console.log("Cognito:relogin:", new Date().toString());

      var self = this;

      return new Promise((resolve, reject) => {

         const cognito_user = self.user_pool.getCurrentUser();

         if (! cognito_user) {
            console.log("Cognito:relogin: no existing user.");
            return resolve(false);
         }

         console.log("Cognito:relogin: existing user.");

         // will refresh your tokens behind the scenes if needed
         cognito_user.getSession(function(error, session) {

            if (error) {
               console.log("Cognito:relogin:session:error:", error);
               cognito_user.signOut();
               return resolve(false);
            }

            self.access_token = session.getAccessToken().getJwtToken();
            self.refresh_token = session.getRefreshToken().getToken();
            self.id_token = session.getIdToken().getJwtToken();
            self.cognito_user = cognito_user;

            console.log("TOKEN UPDATED");

            // Checks the validity of the user.
            self.cognito_user.getUserAttributes(function (error, attributes) {

               if (error) {
                  console.log("Cognito:relogin:getUserAttributes:error:", error);
                  cognito_user.signOut();
                  resolve(false);
               }
               else {
                  resolve(self.extract(attributes));
               }
            })

         }) // getSession

      }) // promise

   }// relogin


   async create(email, password, website) {
      console.log(`Cognito:create:email:${email} password:${password} website:${website}`);

      this.email   = email;
      this.website = website;
 
      const self = this;

      const promise = new Promise((resolve, reject) => {

         var attribute_list = [];
    
         var data_email = {
            Name  : 'email',
            Value : self.email
         };

         var data_website = {
            Name  : 'website',
            Value : self.website 
         };

         var attribute_email   = new AmazonCognitoIdentity.CognitoUserAttribute(data_email);
         var attribute_website = new AmazonCognitoIdentity.CognitoUserAttribute(data_website);

         attribute_list.push(attribute_email);
         attribute_list.push(attribute_website);

         this.user_pool.signUp(email, password, attribute_list, null, function(error, result) {

            if (error) {
               console.log("Cognito:create:error:", error);
               reject(error); 
            } 
            else {
               console.log('Cognito:create:result:user:', result.user.getUsername());
               self.cognito_user = result.user;
               resolve(null);
            }
         })
      })

      return promise;

   }// create


   async delete() {
      console.log("Cognito:delete:");

      const promise = new Promise((resolve, reject) => {

         this.cognito_user.deleteUser(function(error, result) {
            if (error) {
               console.log("Cognito:delete:error:", error);
               reject((error.code) ? error : new Error("Needs authentication."));
            } else {
               console.log('Cognito:delete: success: ' + JSON.stringify(result));
               resolve(result); 
            }
         })
      })

      return promise;

   }// delete


   // Result will be SUCCESS when it works. Must be authenticated. Won't get an error.
   async changePassword(oldPassword, newPassword) {
      console.log("Cognito:changePassword: oldPassword: " + oldPassword + " newPassword:" + newPassword);

      return new Promise((resolve, reject) => {

         this.cognito_user.changePassword(oldPassword, newPassword, function(error, result) {
            if (error) {
               console.log("Cognito:changePassword:error:", error);
               reject((error.code) ? error : new Error("Needs authentication."));
            } else {
               console.log('Cognito:changePassword: success: ' + JSON.stringify(result));
               resolve(result); 
            }
         })
      })

   }// changePassword


   async confirmationCodeResend() {
      console.log("Cognito:confirmationCodeResend:");
 
      const promise = new Promise((resolve, reject) => {

         this.cognito_user.resendConfirmationCode(function(error, result) {
            if (error) {
               console.log("Cognito:confirmationCodeResend:error:", error);
               reject(error);
            } else {
               console.log('Cognito:confirmationCodeResend: success: ' + JSON.stringify(result));
               resolve(result); 
            }
         })
      })

      return promise;
 
   }// confirmationCodeResend


   async forgotPassword(email) {
      console.log(`Cognito:forgotPassword:email:${email}`);

      const cognito_user = new AmazonCognitoIdentity.CognitoUser({
         Username: email,
         Pool: this.user_pool
      });

      const promise = new Promise((resolve, reject) => {

         cognito_user.forgotPassword({

            onSuccess: function(result) {
               console.log('Cognito:forgotPassword:result: ' + result);
               resolve(null);
            },
            onFailure: function(error) {
               console.log('Cognito:forgotPassword:error: ' + error);
               reject(error);
            },
            inputVerificationCode() {
               resolve(null);
            }
         })
      })

      return promise;
 
   }// forgotPassword


   async confirmPassword(email, verificationCode, newPassword) {
      console.log(`Cognito:confirmPassword:email:${email} verificationCode:${verificationCode} newPassword:${newPassword}`);

      const cognito_user = new AmazonCognitoIdentity.CognitoUser({
         Username: email,
         Pool: this.user_pool
      });

      const promise = new Promise((resolve, reject) => {

         cognito_user.confirmPassword(verificationCode, newPassword, {

            onFailure: (error) => {
               console.log("Cognito:confirmPassword:onFailure:", error);
               reject(error);
            },

            onSuccess: (response) =>  {
               console.log("Cognito:confirmPassword: onSuccess: " + JSON.stringify(response));
               resolve(null);
            },
            undefined
         });
       });

      return promise;

   }// confirmPassword


   logout() {
      console.log("Cognito:logout:");

      if (this.cognito_user) {
         this.cognito_user.signOut();
         this.cognito_user = null;
      }

      this.init();
   }

   init() {
      this.email         = null;
      this.access_token  = null; 
      this.refresh_token = null;
      this.id_token      = null;
   }

   extract(attributes) {
      let item = attributes.find(o => o.Name === 'email');
      if (!item) {
         console.log('extract:email not found');
         return false;
      }

      this.email = item.Value;
      console.log(`extract:email:${this.email}`);

      return true;

   }// extract

}// Cognito
