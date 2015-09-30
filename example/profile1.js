"use strict";

/**
 * Example profile. It will connect, login anonymously, then exit
 * @type {{run}}
 */
module.exports = {
    /**
     * The `run` method is required and must return a promise.  Should be
     * easy to get a promise since the LoaderClient is all promise based.
     */
    run(client){
        return client.connect()
            .then(() => {
                return client.loginAnonymously();
            })
            .then(userToken => {
                //console.log(userToken);
            });
    }
}
