/**
 * Class keeps track of Loader progress for a run
 */

function Progress(profiles){
    this.profiles = {};

    for(var i in profiles){
        var profile = profiles[i];
        this.addProfile(profile.name, profile.iterations);
    }
}
module.exports = Progress;

Progress.prototype.addProfile = function(name, total){
    this.profiles[name] = {
        total: total,
        started: 0,
        complete: 0
    }
};

Progress.prototype.startProfile = function(name){
    this.profiles[name].started++;
};

Progress.prototype.profileComplete = function(name){
    this.profiles[name].complete++;
}

Progress.prototype.totalProfiles = function(){
    var total = 0;
    for(var i in this.profiles){
        total += this.profiles[i];
    }
    return total;
}

Progress.prototype.totalProgress = function(){
    var total = 0;
    var totalComplete = 0
    for(var i in this.profiles){
        total += this.profiles[i].total;
        totalComplete += this.profiles[i].complete
    }
    return parseFloat(totalComplete) / total;
};

