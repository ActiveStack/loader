"use strict";
/**
 * Class keeps track of Loader progress for a run
 */

class Progress {
    constructor(profiles) {

        this.profiles = {};

        for (var i in profiles) {
            var profile = profiles[i];
            this.addProfile(profile.name, profile.iterations);
        }
    }

    addProfile(name, total){
        if(total > 0)
            this.profiles[name] = {
                total: total,
                started: 0,
                complete: 0,
                error: 0,
                time: 0
            };
    }

    startProfile(name){
        this.profiles[name].started++;
    }

    profileComplete(name, time){
        this.profiles[name].complete++;
        this.profiles[name].time += time;
    }

    profileError(name, time){
        this.profiles[name].error++;
        this.profiles[name].time += time;
    }

    get totals(){
        var totals = {
            complete: 0,
            error: 0,
            total: 0,
            time: 0
        };
        for(var i in this.profiles){
            totals.total += this.profiles[i].total;
            totals.error += this.profiles[i].error;
            totals.complete += this.profiles[i].complete;
            totals.time += this.profiles[i].time;
        }
        return totals;
    }

    totalProgress(){
        var total = 0;
        var totalComplete = 0
        for(var i in this.profiles){
            total += this.profiles[i].total;
            totalComplete += this.profiles[i].complete + this.profiles[i].error
        }
        return parseFloat(totalComplete) / total;
    };
}
module.exports = Progress;

