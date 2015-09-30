ActiveStack Loader
===================

The ActiveStack Loader gives ActiveStack application developers the ability to do load and end-to-end testing of their
server-side development. You'll do the work of developing what the load testing profiles should be and the loader will 
the work of scaling concurrency, keeping tabs on the profiles and reporting the overall results.

Configuration
-------------

In order to tell the load how and what to do you'll pass it a configuration object that follows the form:

```js
{
    // taken from the ./example directory
    
    // Where should the loader connect to
    gatewayEndpoint: 'http://localhost:8080',
    
    // Which profiles should be run and how many
    profiles: [
        {
            name: 'test1',           // Anything descriptive. Just used to report stats
            script: './profile1.js', // This path must be relative to the CWD or absolute
            iterations: 1            // How many times this profile should be run
        },
        ...
    ],
    // How many clients do we spin up concurrently
    concurrency: 50
}
```

A profile is a JS script that has a specific interface. Each profile will need to export an object with a `run` method 
that takes a single param: an LoaderClient object (see documentation below for LoaderClient APIs). That run method must return a promise that will resolve when the 
profile has completed. Here is an example of a simple profile that just authenticates anonymously:
 
```js
// Taken from the ./example directory
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

```

LoaderClient
------------

An instance of LoaderClient will be passed to your profile's `run` method.  It will allow you to interact with the AS
backend.

### LoaderClient::connect() => Promise

Returns a promise that will resolve once the client has connected to the gateway.

### LoaderClient::loginAnonymously() => Promise

Returns a promise that will resolve once authentication has completed. Promise will
resolve with a `UserToken` if successful and null if not.

### LoaderClient::findByExample(Object example) => Promise

Requires an object to send to the backend to query for. Returns a promise that will resolve
with the result of the query.