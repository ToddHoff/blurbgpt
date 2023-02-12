const nodemailer = require('nodemailer');
const ses        = require('nodemailer-ses-transport');

module.exports = async function(cfg, fromEmail, toEmail, subject, message) {
   console.info(`SendEmail:fromEmail:${fromEmail} toEmail:${toEmail} subject:${subject}:`);

   const transporter = nodemailer.createTransport({SES: cfg.SES});

   const result = await transporter.sendMail({
      from    : fromEmail, 
      to      : toEmail, 
      subject : subject,
      html    : message 
   })

   console.info(`SendEmail:toEmail:${toEmail} subject:${subject} result:`, result);

}// SendEmail
