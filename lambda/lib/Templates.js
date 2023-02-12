const ApplyStringTemplate = require("./ApplyStringTemplate");


const TEMPLATES = {

  tryit_error: `
     Hi,
     <P> 
     Just letting you know there was a problem accessing your book {{url}}. 
     <P>
     The problem we saw was:
     <PRE> 
     {{err}}
     </PRE> 
     <P> 
     It's hard to know exactly what went wrong. The only "fix" is to try again. Please login to {{cfg.admin.home_url}} and try a different URL for your book. 
     <P> 
     Now that the bad news is out of the way, let's talk about a more pleasant topic...
     <P>
     Thanks for using Best Sellers Rank!
  `,

  tryit_welcome: `
     Hi,
     <P> 
     Great news: your daily report for {{url}} was created and scheduled to start running. You should start receiving reports soon.
     <P> 
     {{#if nick}}
     Every book has a short nickname that we in report subject lines. We calculated this nickname from the book title: <i>{{nick}}</i>. 
     <p>
     Don't like that nickname? Please go to {{cfg.admin.home_url}} and change it to whatever you prefer. 
     {{/if}}
     <P> 
     Thanks for using Best Sellers Rank!
  `,


  welcome_signup: `
     Thanks for giving Best Sellers Rank a try. We appreciate your business and sincerely 
     hope you'll find value in our service.
     <p>
     Do you want to get started tracking books? Please login to {{cfg.admin.home_url}} and you can track all the books you want.
     <p>
     We don't have a name for you yet, which will make all our reports a little impersonal. 
     If you'd like more personalized reports, please login to {{cfg.admin.home_url}} and
     edit your profile.
     <p>
     Here's an overview of how the Best Sellers Rank process works:
     <ul>
     <li> You enter a URL for each book you want to track on Amazon. It could be one of your books or a competitor's book.
     <li> We send reports to your inbox based on the plan for that book. It could be hourly, daily, or weekly. 
     <li> You can then use the information in the reports to help improve your author business.
     <li> If you're tracking a lot of books, you may want to set up an email filter to move all Best Sellers Rank reports to their own folder.
     <li> You can cancel or upgrade to a paid plan at any time. With a paid plan, you can track more books and choose different reporting periods.
     <li> Getting book data is a tricky and error prone business. We try our best, but we'd appreciate your understanding when things don't go exactly right.
     </ul>
     {{#if tryit}}
        <p>You selected a book as part of the signup process. We're validating your book right now. When you login you'll see the result of the
        process. If everything went fine then your book will be added. If something went wrong, say an invalid URL was entered, just
        try again.
     {{/if}}
     <p>
     If you have any questions or suggestions please send us an email at {{cfg.admin.list_from_email}}. We really want
     to make Best Sellers Rank better, so don't be shy.
     <p>
     Thanks! 
  `,

  welcome: `
     Hi,
     {{common}}
  `,

  intro: `
<div class="intro">
{{#if user.first_name.length}}
Hi {{user.first_name}},
{{else}}
Hi,
{{/if}}
<p>
Here's your {{subject}} Best Sellers Rank report for {{period}}:
<table>
<tr>
  <td width="5%"> <b>Title</b>:</td>
  <td> <a href="{{product.url}}">{{stats.title}}</a></td>
</tr>
<tr>
   <td width="5%"><b>Author</b>: </td>
   <td>{{stats.author}}</td>
</tr>
<tr>
   <td width="5%"><b>Type</b>:</td>
   <td> {{stats.product_type}}</td>
</tr>
<tr>
   <td width="5%"><b>Store</b>:</td>
   <td> {{stats.pay_type}} {{stats.store_type}} (<span class="order_type">{{stats.order_type}}</span>) </td>
</tr>
{{#if stats.series}}
<tr>
   <td width="5%"><b>Series</b>:</td>
   <td> Book {{stats.series.index}} of {{stats.series.length}} in {{stats.series.series}}</td> 
</tr>
{{/if}}
</table>

{{#if custom_msg}}
   <div class="intro_custom_msg">
      {{custom_msg}}
   </div>
{{/if}}

</div>
`,

  free: `
<div class="free-msg">
Need to track more books? Upgrade to one of several delicious paid plans. Yes, <a href="{{home_url}}/show-plans">I want to upgrade now</a>.
</div>
`,

  expired: `
<div class="expired-msg">
This is just a reminder that your Best Sellers Rank plan expires in {{days}} days. After that you'll stop getting
these wonderful reports. Don't that happen to you! Yes, <a href="{{home_url}}/show-plans">I want to keep going</a>.
</div>
`,

  footer: `
<div class="footer">

<p><a class="button" href="mailto:Enter%20Email?subject=You%20Might%20Like%20Best%20Sellers%20Rank&body=Thought%20you%20might%20be%20interested%20in%20this:%20https://bestsellersrank.me. I found it useful.">Tell a Friend About Best Sellers Rank!</a></p>

<hr width="50%" style="margin-top:35px" align="center">

<p>You received this email because you've purchased the <a href="https://bestsellersrank.me">Best Sellers Rank</a> service.</p>

<p>
We want to make this as useful a service as possible for you, so we love getting your ideas and suggestions for improvements. 
Have an idea? <a href="mailto:{{info_email}}?subject=I have an idea.">Email us!</a>
<p>
Generating these reports is a tricky process. If you find any problems please let us know so we can fix it. <a href="mailto:{{info_email}}?subject=I have a problem.">Email us!</a>
<P>
<span style="font-size:x-small">({{cfg.env}})</span>
</div>
`,

   summary: `

{{#if is_store_rank_trend_up}}
<div style="margin-top:14px;margin-bottom:10px">
<p>Your sales rank has trended down (or stayed even) for the last {{min_trend_cnt}} {{units}}. Maybe some promotions need adjusting?</p>
</div>
{{/if}} 

{{#if is_store_rank_trend_down}}
<div style="margin-top:14px;margin-bottom:10px">
<p>🏆 Congratulations! Your sales rank has trended up (or stayed even) for the last {{min_trend_cnt}} {{units}}. Amazon's recommendation algorithm loves that kind of consistency. Keep up the good work! 😍👍👍</p>
</div>
{{/if}} 

<table class="summary">
<tr>
<td class="w-50 center" style="border: 1px solid grey">
   <div class="summary_metric">Sales Rank</div>
   <div class="summary_value"> 
      {{fmtNumber stats.sales_rank}}
{{#if changes.sales_rank}}
      <span class="summary_change" style="color:{{toColor changes.sales_rank inverse=true}}">{{toSymbol changes.sales_rank}}{{fmtNumber changes.sales_rank abs=true noz=true}}</span>
{{/if}}
   </div>
</td>
<td class="w-50 center" style="border:1px solid grey">
   <div class="summary_metric">Total Reviews</div>
   <div class="summary_value"> 
      {{fmtNumber stats.review_cnt}}
{{#ifCond changes.review_cnt "!=" 0}}
      <span class="summary_change" style="color:{{toColor ../changes.review_cnt}}">{{toSymbol ../changes.review_cnt}}{{fmtNumber ../changes.review_cnt abs=true noz=true}}</span>
{{/ifCond}}
   </div>
</td>
</tr>
<tr>
<td class="w-50 center" style="border: 1px solid grey">
   <div class="summary_metric">Review Average</div>
   <div class="summary_value"> 
      {{fmtNumber stats.review_ave}} stars 
{{#ifCond changes.review_ave "!=" 0}}
      <span class="summary_change" style="color:{{toColor ../changes.review_ave}}">{{toSymbol ../changes.review_ave}}{{fmtNumber ../changes.review_ave abs=true noz=true}}</span>
{{/ifCond}}
   </div>
</td>
<td class="w-50 center" style="border:1px solid grey">
   <div class="summary_metric">Price</div>
   <div class="summary_value"> 
      {{fmtNumber stats.price money=true currency=stats.currency}}
{{#ifCond changes.price "!=" 0}}
      <span class="summary_change" style="color:{{toColor ../changes.price}}">{{toSymbol ../changes.price}}{{fmtNumber ../changes.price abs=true noz=true}}</span>
{{/ifCond}}
   </div>
</td>
</tr>
</table>
`,

  changes: `
<div class="title">{{title}}</div>
<div class="subtitle">{{period}}</div>
<table>
   <tr>
     <th>Trend</th>
     <th>Metric</th>
     <th>Change</th>
   </tr>
   {{#each changes.all}}
   <tr>
      <td width="25%">
         <span style="color:{{toColor this.direction this.opts}}">{{this.direction}}</span>
      </td>
      <td>
         {{this.description}}
      </td>
      <td class="number">
      {{#if this.diff}}
         <span style="color:{{toColor this.diff this.opts}}">{{toSymbol this.diff}}{{fmtNumber this.diff abs=true}}</span>
      {{else}}
         &nbsp;
      {{/if}}
      </td>
   </tr>
   {{/each}}
{{#if changes.description_changed}}
   <tr>
      <td width="25%">
         <span>Description Change</span>
      </td>
      <td colspan="2">
         {{{changes.description_diff_html}}}
      </td>
   </tr>
{{/if}}
</table>`,

  metric_history: `
<div class="title">{{title}}</div>
<div class="subtitle">{{subtitle}}</div>
<table>
   <tr>
     <th>Metric</th>
     <th>Mean</th>
     <th>Max</th>
     <th>Min</th>
   </tr>
   {{#each metrics as |item|}}
   <tr>
      <td width="35%">
         <span>{{item.[0]}}</span>
      </td>
      <td class="number">
         <span>{{fmtNumber item.[1].mean decimals=2}}</span>
      </td>
      <td class="number">
         <span>{{fmtNumber item.[1].max}}</span>
      </td>
      <td class="number">
         <span>{{fmtNumber item.[1].min}}</span>
      </td>
   </tr>
   {{/each}}
</table>`,

  rankings: `
<div class="title">Current Rankings</div>
<table>
   <tr>
     <th>Category</th>
     <th>{{now_period}}</th>
{{#if changes.pranks}}
     <th>{{prev_period}}</th>
{{/if}}
   </tr>
   <tr>
      <td class="w-30" valign="middle">
         <span><b>{{stats.pay_type}} {{stats.store_type}}</b></span>
      </td>
{{#if changes.pranks}}
      <td class="w-35 center"> 
{{else}}
      <td class="w-70 center"> 
{{/if}}
         <table class="w-100 no-border"><tr>
            <td class="w-75 number no-border center" valign="middle">
               <span>{{fmtNumber stats.sales_rank}}</span>
            </td>
            <td class="w-25 no-border center"        valign="middle">{{toAward stats.sales_rank}}</td>
         </tr></table>
      </td>
{{#if changes.pranks}}
      <td class="w-35">
         <table class="w-100 no-border"><tr>
            <td class="w-75 number no-border center" valign="middle"><span>{{fmtNumber pstats.sales_rank}}</span></td>
            <td class="w-25 no-border center"        valign="middle">{{toAward pstats.sales_rank}}</td>
         </tr></table>
      </td>
{{/if}}
   </tr>
   {{#each rank_labels}}
   <tr>
      <td class="w-30" valign="middle">
         <span><b>{{this}}</b></span>
      </td>
{{#if ../changes.pranks}}
      <td class="w-35 center"> 
{{else}}
      <td class="w-70 center"> 
{{/if}}
         <table class="w-100 no-border"><tr>
            <td class="w-75 number no-border center" valign="middle"><span>{{fmtNumber (lookup ../ranks @index)}}</span></td>
            <td class="w-25 no-border center"        valign="middle">{{toAward (lookup ../ranks @index)}}</td>
         </tr></table>
      </td>
{{#if ../changes.pranks}}
      <td class="w-35">
         <table class="w-100 no-border"><tr>
            <td class="w-75 number no-border center" valign="middle"><span>{{fmtNumber (lookup ../changes.pranks this) noz=true}}</span></td>
            <td class="w-25 no-border center"        valign="middle">{{toAward (lookup ../changes.pranks this)}}</td>
         </tr></table>
      </td>
{{/if}}
   </tr>
   {{/each}}
</table>
`,

    reviews: `
<div class="title">Current Reviews</div>
<table>
   <tr>
     <th>Rating</th>
     <th>{{now_period}}</th>
{{#if pstats}}
     <th>{{prev_period}}</th>
{{/if}}
   </tr>
   <tr>
      <td width="25%">
         <span><b>Total</b></span>
      </td>
      <td class="number" valign="middle"> 
         <span>{{fmtNumber stats.review_cnt}}</span>
      </td>
{{#if pstats}}
      <td class="number" valign="middle"> 
         <span>{{fmtNumber pstats.review_cnt}}</span>
      </td>
{{/if}}
   </tr>
   <tr>
      <td width="25%">
         <span><b>Average</b></span>
      </td>
      <td class="number" valign="middle">
         <span>{{fmtNumber stats.review_ave}} stars</span>
      </td>
{{#if pstats}}
      <td class="number" valign="middle"> 
         <span>{{fmtNumber pstats.review_ave}} stars</span>
      </td>
{{/if}}
   </tr>
   {{#each review_labels}}
   <tr>
      <td width="25%">
         <span><b>{{this}}</b></span>
      </td>
      <td class="number" valign="middle"> 
         <span>{{fmtNumber (lookup ../review_percentages @index)}}%</span>
      </td>
{{#if ../pstats}}
      <td class="number" valign="middle"> 
         <span>{{fmtNumber (lookup ../preview_percentages @index)}}%</span>
      </td>
{{/if}}
   </tr>
   {{/each}}
</table>
`,

   hourly_nochange: `
<p>It's a short one because there were no changes since the last report.</p>
<p>We let you know there's no change so you won't become overwhelmed with hourly reports that aren't telling you anything new.</p>
`,

   daily_report: `
<head>
   <meta charset="utf-8">
   <meta name="viewport" content="width=device-width">
   <meta name="x-apple-disable-message-reformatting">
   <meta http-equiv="X-UA-Compatible" content="IE=edge"> 
   <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">

   <title>{{subject}} Best Sellers Report</title>

   <style>
     th { 
        font-size: large;
        color: gold;
        background-color: black;
        text-align : center;
        padding: 6px 6px 6px 6px;
     }
     td { 
        border: 1px solid #ddd;
        text-align : center;
        font-size: large;
     }
     table {
        width: 100%;  
        background-color: white; 
        cellpadding: 0;
        text-align : center;
     }
     body {
        padding:0; 
        margin:0; 
     }
     .title {
        margin-top: 25px;
        margin-bottom: 5px;
        font-size: xx-large;
     }
     .subtitle {
        font-size     : x-large;
        font-style    : italic;
        margin-bottom : 10px;
     }
     .number {
        text-align : center;
     }
     .order_type {
        font-style    : italic;
        font-size     : medium;
     }
     .field {
        background-color:white; 
        padding: 5px 5px 15px 5px; 
        margin-top: 25px;
     }
     .summary {
        text-align : center;
     }
     .summary_value {
        font-size  : x-large; 
        top        : 0; 
        color      : black; 
        font-style : bold;
        background-color: white;
        padding: 4px 4px 4px 4px;
     }
     .summary_change {
        font-size  : large !important; 
        margin-left: 6px;
     }
     .summary_metric {
        font-size  : x-large !important; 
        color      : gold;
        background-color : black;
        width: 100%;
        padding-top: 4px;
        padding-bottom: 4px;
     }
     .intro_custom_msg {
        margin-top: 25px;
        margin-bottom: 25px;
     }
     .intro table td {
        border: none;
        text-align: left;
     }
     .no-border {
        border: none;
     }
     .w-100 {
        width: 100% !important;
     }
     .w-70 {
        width: 70% !important;
     }
     .w-75 {
        width: 75% !important;
     }
     .w-25 {
        width: 25% !important;
     }
     .w-30 {
        width: 30% !important;
     }
     .w-35 {
        width: 35% !important;
     }
     .w-50 {
        width: 50% !important;
     }
     .center {
        text-align: center;
     }
     .free-msg {
        margin-top       : 45px;
        text-align       : center;
        background-color : white;
     }
     .expired-msg {
        margin-top       : 45px;
        text-align       : center;
        background-color : white;
     }
     .footer {
        margin-top       : 45px;
        text-align       : center;
        background-color : white;
        font-size        : small;
     }
     .container {
        font-size: medium;
     }
     .award {
        height : 50px; 
        width  : 50px; 
     }
     .button {
        background: #E0FFFF;
        color: black !important;
        -webkit-border-radius: 28;
        -moz-border-radius: 28;
        border-radius: 28px;
        font-family: Arial;
        font-size: 16px;
        padding: 6px 16px 6px 16px;
        text-decoration: none;
     }
   </style>
</head>
<body>
<div class="container">
{{#each pre_blocks}}
{{#if this.title}}
   <div class="title">{{this.title}}</div>
{{/if}}
{{#if this.subtitle}}
   <div class="subtitle">{{this.subtitle}}</div>
{{/if}}
   {{html}}
{{/each}}
<center>
<div class="field">
{{#each report_blocks}}
{{#if this.title}}
   <div class="title">{{this.title}}</div>
{{/if}}
{{#if this.subtitle}}
   <div class="subtitle">{{this.subtitle}}</div>
{{/if}}
   {{html}}
{{/each}}
</div>
{{#each post_blocks}}
{{#if this.title}}
   <div class="title">{{this.title}}</div>
{{/if}}
{{#if this.subtitle}}
   <div class="subtitle">{{this.subtitle}}</div>
{{/if}}
   {{html}}
{{/each}}
</div>
</center>
</div>
</body>
</html>
`,

   renewal_notice : `
{{#if user.first_name.length}}
Hi {{user.first_name}},
{{else}}
Hi,
{{/if}}
<p>
We hope you've enjoyed using Best Sellers Rank so far. Your subscription will automatically renew in the next 7 days. 
A charge of $99.95 USD will be deducted from your PayPal account on Jul 15, 2020.
<p>
If there's anything we can help you with, please <a href="mailto:{{info_email}}?subject=I need some help.">email us</a>.
<p>
Thanks for using Best Sellers Rank!
`,

   summary_report: `
<head>
   <meta charset="utf-8">
   <meta name="viewport" content="width=device-width">
   <meta name="x-apple-disable-message-reformatting">
   <meta http-equiv="X-UA-Compatible" content="IE=edge"> 
   <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">

   <title>Best Sellers Rank Best Sellers Report</title>

   <style>
     th { 
        font-size: large;
        color: gold;
        background-color: black;
        text-align : center;
        padding: 6px 6px 6px 6px;
     }
     td { 
        border: 1px solid #ddd;
        text-align : center;
        font-size: large;
     }
     table {
        width: 100%;  
        background-color: white; 
        cellpadding: 0;
        text-align : center;
     }
     body {
        padding:0; 
        margin:0; 
     }
     .footer {
        margin-top       : 45px;
        text-align       : center;
        background-color : white;
        font-size        : small;
     }
     .container {
        font-size: medium;
     }
     .button {
        background: #E0FFFF;
        color: black !important;
        -webkit-border-radius: 28;
        -moz-border-radius: 28;
        border-radius: 28px;
        font-family: Arial;
        font-size: 16px;
        padding: 6px 16px 6px 16px;
        text-decoration: none;
     }
   </style>
</head>
<body>
<div class="container">

<div class="intro">
{{#if user.first_name.length}}
Hi {{user.first_name}},
{{else}}
Hi,
{{/if}}

<p>Here's your Best Selling Books report for {{period}}.</p>
<p>You can use this information to help you decide where to invest going forward:</p>
<ul>
<li>Which promotional efforts actually worked? Do you want to do more of those?
<li>Which of your books perform the best? Do you want to write more of those? 
<li>Which categories do your books perform the best in? Do you want to write more to market? 
</ul>
</div>
<pre>

</pre>

{{html}}

</div>

{{footer}}

</body>
</html>
`


}; // TEMPLATES


class Templates {

   constructor(cfg) {
      this.cfg = cfg;
   }

   applyBlock(templateName, data = {}) {
      const template = TEMPLATES[templateName];
      if (!template) throw new Error(`Unknown template ${templateName}`);
 
      return { html: ApplyStringTemplate(template, data) };
   }

   apply(templateName, data = {}) {
      const template = TEMPLATES[templateName];
      if (!template) throw new Error(`Unknown template ${templateName}`);
 
      return ApplyStringTemplate(template, data);
   }
};

module.exports = Templates; 
