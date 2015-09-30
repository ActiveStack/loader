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
    static run(profilePath, config){
        // Create the client for the script to use
        var client = new LoaderClient(config.gatewayEndpoint);

        try{
            // Load the profile
            var profile;
            if(path.isAbsolute(profilePath))
                profile = require(profilePath);
            else
                profile = require(path.resolve(process.cwd(), profilePath));

            if(!profile.run)
                ProfileContainer.handleError('no run method on profile: '+profilePath);

            var promise = profile.run(client);

            if(!promise)
                ProfileContainer.handleError('No promise returned by profile: '+profilePath);

            promise.then(() => {
                process.send({stats: client.stats})
                process.exit();
            });

        }catch(e){
            ProfileContainer.handleError(e.message);
        }

    }

    static handleError(message){
        process.send({error: message})
        process.exit();
    }
}

module.exports = ProfileContainer;

