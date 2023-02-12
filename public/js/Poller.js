class Poller  {

   constructor(cfg) {
      console.log("Poller:");

      this.cfg                 = cfg;
      this.poll_timer_interval = 1000 * 12;
      this.poll_limit          = 10;
      this.poll_cnt            = 0;
   }

   poll() {
      console.log("Poller:poll:cnt:", app.poller.poll_cnt);

      if (app.poller.poll_cnt++ >= app.poller.poll_limit) {
         console.log("poll: timer timedout");
         app.poller.stop();
         notifyError("Adding your book timed out. Please try again later.");
      }
      else {
         app.invoke("/poll");
      }

   }// poll

   start() {
      console.log("Poller:start:");

      this.poll_timer_id && clearInterval(this.poll_timer_id); 
      this.poll_cnt      = 0;
      this.poll_timer_id = setInterval(this.poll, this.poll_timer_interval);

   }// start

   stop() {
      console.log("Poller:stop");

      if (this.poll_timer_id == null) return;

      clearInterval(this.poll_timer_id); 
      this.poll_timer_id  = null;
      this.poll_cnt       = 0;

      app.showBooks();

   }// stop

}// Poller
