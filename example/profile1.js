"use strict";

module.exports = {
    run(client){
        return client.connect()
            .then(() => {
                return client.loginAnonymously();
            })
            .then(userToken => {
                console.log(userToken);
            });
    }
}
