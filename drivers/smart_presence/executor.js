function Executor() {
    this.queue = [];
    // The executor checks for new jobs (from the queue) every x time.
    // So a scheduled job always stars within this interval.
    this.jobCheckInterval = 200;
}

Executor.prototype.start = function() {
    if(!this.worker)
        this.worker = setInterval(this.work.bind(this), this.jobCheckInterval);
};

Executor.prototype.stop = function() {
    if(this.worker) {
        clearInterval(this.worker);
        delete this.worker;
    }
};

/**
 * Schedules a function to be executed.
 * @param job           {Function}  Some function to executute.
 * @param runAtMillis   {number}    When to run the job in epoch time notation (millis since 1970)
 * @param name          {string}    The name of the job
 */
Executor.prototype.schedule = function (job, runAtMillis, name) {
    if(!name) {
        throw new Error("You've forgot to supply a name for a scheduled job.")
    }

    if(!this.hasJobScheduled(name)) {
        this.queue.push({job: job, name:name, runAtMillis: runAtMillis});
    }
    else {
        console.warn("Not registering a job with the name", name, "as a job with that name already exists.");
    }
};

Executor.prototype.hasJobScheduled = function(name) {
    return this.queue.filter(function(entry) { return entry.name === name; }).length !== 0;
};

Executor.prototype.next = function () {
    return this.queue.shift();
};

Executor.prototype.work = function () {
    var job = this.next();
    if (job) {
        if(!(job.job && job.runAtMillis)) {
            throw new Error("Job has an invalid format. Should have a 'job', 'runAtMillis', and a 'job' field.")
        }
        else {
            if(job.runAtMillis <= new Date().getTime() - 100) { // minus a little correction for processing time
                job.job();  // TODO: callback from job to the next line
                this.worker = setTimeout(this.work.bind(this), this.jobCheckInterval);
            }
            else {
                // if it's not time yet, put it back where it belongs.
                this.schedule(job.job, job.runAtMillis, job.name);
            }
        }
    }
};


module.exports = Executor;