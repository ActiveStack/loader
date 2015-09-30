// strict mode
/**
 * This Class handles spinning up clients and gathering statistics for reporting
 */
var cluster = require('cluster'),
    Progress = require('./progress'),
    readline = require('readline'),
    ProfileContainer = require('./profile_container');

function LoaderForeman(config){
    this.numWorkers = 0;
    this.progress = new Progress(config.profiles);
    this.stats = {};
    this.config = config;
    this.profileIterator = null;
    this.debug = false;
}
module.exports = LoaderForeman;

LoaderForeman.prototype.run = function(){
    if (cluster.isMaster) {
        this.initReporter();
        while (this.numWorkers < this.config.concurrency) {
            if(!this.startWorkerIfNeeded()) break;
        }
    } else {
        ProfileContainer.run(process.env['LOADER_PROFILE']);
    }
};

LoaderForeman.prototype.initReporter = function(){
    setInterval(function(){
        process.stdout.write('Active: '+this.numWorkers+' | Remaining: '+this.profileIterator.length+'\r');
    }.bind(this), 1000);
};

LoaderForeman.prototype.startWorkerIfNeeded = function(){
    var profile = this.getNextProfile();
    if(profile){
        var worker = cluster.fork({LOADER_PROFILE: profile});
        worker.profile = profile;
        worker.on('exit', this.onWorkerExit.bind(this, worker));
        worker.on('message', this.onWorkerMessage.bind(this, worker));
        this.numWorkers++;
        return true;
    }
    else
        return false;

};

LoaderForeman.prototype.done = function(){
    console.log("Forman done");
    console.log("Stats: "+JSON.stringify(this.stats,null,2));
    process.exit();
}

LoaderForeman.prototype.getNextProfile = function(){
    // init the iterator
    // TODO: implement randomness
    if(!this.profileIterator){
        this.profileIterator = [];
        for(var i in this.config.profiles){
            var profile = this.config.profiles[i];
            for(var j = 0; j < profile.iterations; j++){
                this.profileIterator.push(profile.script)
            }
        }
    }

    return this.profileIterator.shift();
};

LoaderForeman.prototype.onWorkerExit = function(worker){
    this.numWorkers--;

    this.startWorkerIfNeeded();
    if(this.numWorkers <= 0)
        this.done();
};

LoaderForeman.prototype.onWorkerMessage = function(worker, message){
    if(message.error){
        console.error(message.error);
    }
    else if(message.stats){
        for(var key in message.stats){
            if(!this.stats[key])
                this.stats[key] = { count: 0, waitTime: 0 };
            this.stats[key].count += message.stats[key].count;
            this.stats[key].waitTime += message.stats[key].waitTime;
        }
    }
};