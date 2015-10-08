"use strict";

var fs = require('fs'),
    LoaderClient = require('./client'),
    path = require('path');

/**
 * Should provide the DSL fro the profile to use:
 *   Create the client
 *   Report back to the foreman the total messages, their kinds, average response times
 * @param profile
 * @constructor
 */
class ProfileContainer{
    constructor(profilePath, config){
        this.profilePath = profilePath;
        this.config = config;
        this.start_time = null;
        this.end_time = null;
        this.client = new LoaderClient(this.config.gatewayEndpoint);
    }

    run(){
        // Create the client for the script to use
        try{
            // Load the profile
            var profile;
            if(path.isAbsolute(this.profilePath))
                profile = require(this.profilePath);
            else
                profile = require(path.resolve(process.cwd(), this.profilePath));

            if(!profile.run)
                this.handleError('no run method on profile: '+this.profilePath);

            this.start_time = new Date().getTime();
            var promise = profile.run(this.client);

            if(!promise)
                this.handleError('No promise returned by profile: '+this.profilePath);

            promise.timeout(60000)
                .then(() => {
                    process.send({stats: this.client.stats.stats, time: this.time});
                },(err) => {
                    console.log("Fail!:"+err);
                    this.handleError(err);
                })
                .done(() => {
                    process.exit();
                })

        }catch(e){
            this.handleError(e.message);
        }

    }

    handleError(message){
        process.send({error: message, stats: this.client.stats.stats, time: this.time})
        process.exit();
    }

    get time(){
        var result = 0;
        if(!this.end_time)
            this.end_time = new Date().getTime();
        if(this.start_time)
            result = this.end_time-this.start_time

        return result;
    }
}

module.exports = ProfileContainer;

