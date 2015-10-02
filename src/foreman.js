"use strict";

/**
 * This Class handles spinning up clients and gathering statistics for reporting
 */
var cluster = require('cluster'),
    Progress = require('./progress'),
    readline = require('readline'),
    ProfileContainer = require('./profile_container'),
    sprintf = require("sprintf").sprintf,
    fs = require('fs'),
    hw = 90;

class LoaderForeman {
    constructor(config) {
        this.numWorkers = 0;
        this.progress = new Progress(config.profiles);
        this.stats = {};
        this.config = config;
        this.profileIterator = null;
        this.debug = false;
        this._startTime = null;
    }

    run(){
        if (cluster.isMaster) {
            this._printHeader();
            this._startTime = new Date().getTime();
            this._initReporter();
            while (this.numWorkers < this.config.concurrency) {
                if(!this._startWorkerIfNeeded()) break;
            }
        } else {
            new ProfileContainer(process.env['LOADER_PROFILE'], this.config).run();
        }
    }

    _initReporter(){
        setInterval(this._printProgress.bind(this), 100);
    }

    _startWorkerIfNeeded(){
        var profile = this._getNextProfile();
        if(profile){
            var worker = cluster.fork({LOADER_PROFILE: profile.script});
            worker.profile = profile;
            worker.on('exit', this._onWorkerExit.bind(this, worker));
            worker.on('message', this._onWorkerMessage.bind(this, worker));
            this.numWorkers++;
            this.progress.startProfile(profile.name);

            return true;
        }
        else
            return false;
    };

    _printHeader(){
        var header = fs.readFileSync(__dirname+'/../resources/header.txt').toString();
        console.log(header);
        console.log();
    }

    _printProgress(){
        var runningTime = (new Date().getTime()-this._startTime)/1000.0;
        var totalProgress = this.progress.totalProgress();
        var totalSpace = hw-62;
        var blocks = Math.round(totalProgress*totalSpace);
        var spacePadding = totalSpace-blocks;
        var progString = sprintf(`| Active: %4u | Progress: [%'#-${blocks}s%${spacePadding}s] - %3u%% | Running Time: %6.1fs |\r`,
            this.numWorkers, '', '', Math.round(totalProgress*100), runningTime);
        process.stdout.write(progString);
    }

    _printProfileStats(){
        console.log('\n');
        // Print out the profile statistics
        var nameColWidth = hw-48
        p(`| %-${nameColWidth}s | %-5s | %-5s | %-5s | %-7s | %-7s |`,
            'Profile','Fail','Win','Total','Time','Avg.');
        p(`|%'-${hw-2}s|`,'');
        for(var key in this.progress.profiles){
            var profile = this.progress.profiles[key];
            p(`| %-${nameColWidth}s | %-5u | %-5u | %-5u | %-7u | %-7u |`,
                key, profile.error, profile.complete, profile.total, profile.time, Math.round(profile.time/profile.total));
        }
        p(`|%'-${hw-2}s|`,'');
        var totals = this.progress.totals;
        p(`| %-${nameColWidth}s | %-5u | %-5u | %-5u | %-7u | %-7s |`,
            'Total', totals.error, totals.complete, totals.total, totals.time, Math.round(totals.time/totals.total));
    }

    _printEventStats(){
        console.log('\n');
        // Print out the event statistics
        var nameColWidth = hw-22
        p(`| %-${nameColWidth}s | %-5s | %-7s |`, 'Event','Count','Time');
        p(`|%'-${hw-2}s|`,'');
        var totalWait = 0;
        for(var key in this.stats){
            var stat = this.stats[key];
            p(`| %-${nameColWidth}s | %-5u | %-7u |`, key, stat.count, stat.waitTime);
            totalWait += stat.waitTime;
        }
        p(`|%'-${hw-2}s|`,'');
        p(`| %-${nameColWidth}s | %-5u | %-7u |`, 'Total', this._totalStats(), totalWait);
    }

    _done(){
        this._printProgress();
        this._printProfileStats();
        this._printEventStats();
        process.exit();
    }

    _totalStats(){
        var total = 0;
        for(var key in this.stats){
            var stat = this.stats[key];
            total += stat.count;
        }
        return total;
    }

    _getNextProfile(){
        // init the iterator
        // TODO: implement randomness
        if(!this.profileIterator){
            this.profileIterator = [];
            for(var i in this.config.profiles){
                var profile = this.config.profiles[i];
                for(var j = 0; j < profile.iterations; j++){
                    this.profileIterator.push(profile)
                }
            }
        }

        return this.profileIterator.shift();
    }

    _onWorkerExit(worker){
        this.numWorkers--;

        this._startWorkerIfNeeded();
        if(this.numWorkers <= 0)
            this._done();
    };

    _onWorkerMessage(worker, message){
        if(message.error){
            console.error(message.error);
            this.progress.profileError(worker.profile.name, message.time);
            return;
        }

        this.progress.profileComplete(worker.profile.name, message.time);

        for(var key in message.stats){
            if(!this.stats[key])
                this.stats[key] = { count: 0, waitTime: 0 };
            this.stats[key].count += message.stats[key].count;
            this.stats[key].waitTime += message.stats[key].waitTime;
        }
    }
}

function p(){
    console.log(sprintf.apply(null,arguments));
}

module.exports = LoaderForeman;