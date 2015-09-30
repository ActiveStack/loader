module.exports = {
    gatewayEndpoint: 'http://localhost:8080',
    /**
     * Which profiles should be run and how many
     */
    profiles: [
        {
            name: 'test1',
            script: './profile1.js',
            iterations: 1
        },
        {
            name: 'test2',
            script: './test_profile2.js',
            iterations: 0
        },
    ],
    /**
     * How many clients do we spin up concurrently
     */
    concurrency: 50
}