"use strict";

var io = require('socket.io-client'),
    Q = require('q'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    uuid = require('node-uuid'),
    EventCounter = require('./event_counter');

/**
 * This class should only have a single instance per process... it is not enforced but it will not work properly
 * @param socketIOEndpoint
 * @constructor
 */
class LoaderClient extends EventEmitter{
    constructor(socketIOEndpoint){
        super();

        this.endpoint = socketIOEndpoint;
        this._socket = null;
        this.connected = false;
        this.session = null;
        this.userToken = null;
        this.stats = new EventCounter();

        this._connectDeferred = null;
        this._loginDeferred = null;
        this.pendingResponses = {};
    }

    /**
     * Connect the client to the gateway
     * @returns {*|promise}
     */
    connect(){
        this._socket = io.connect(this.endpoint
            //{
            //    transports: ['websocket'],
            //    secure: true
            //}
        );
        this._socket.on('connect', this._onConnected.bind(this));
        this._socket.on('disconnect', this._onDisconnected.bind(this));
        this._socket.on('push', this._onPush.bind(this));
        this._socket.on('gatewayConnectAck', this._onGatewayConnectAck.bind(this));
        this._connectDeferred = Q.defer();
        return this._connectDeferred.promise;
    }

    /**
     * Login Anonymously
     * @returns {*|promise}
     */
    loginAnonymously(){
        // Push the authentication request
        var request = {
            cn: 'com.percero.agents.auth.vo.AuthenticationRequest',
            authProvider: 'anonymous'
        };

        return this._doLogin(request);
    }

    /**
     * Will do username password authentication
     * @param username
     * @param password
     * @param providerId
     */
    loginUserPass(username, password, providerId){
        var request = {
            cn: "com.percero.agents.auth.vo.AuthenticationRequest",
            authProvider: providerId,
            credential: username+":"+password
        };

        return this._doLogin(request);
    }

    /**
     * Finds an object by example
     * @param example
     */
    findByExample(example){
        var message = {
            cn: 'com.percero.agents.sync.vo.FindByExampleRequest',
            theObject: example
        };
        return this._sendMessage('findByExample', message, this._getShortClassName(example.cn));
    }

    /**
     * Finds an object by its ID
     * @param className
     * @param ID
     * @returns {*|promise}
     */
    findById(className, ID){
        var message = {
            cn: 'com.percero.agents.sync.vo.FindByIdRequest',
            theClassName: className,
            theClassId: ID
        };
        return this._sendMessage('findById', message, this._getShortClassName(className));
    }

    findAllById(cnpArray){
        var promises = [];
        for(var cnp of cnpArray){
            promises.push(this.findById(cnp.className, cnp.ID, cnp.className));
        }
        return Q.all(promises);
    };

    /**
     * Helper function to make reporting nicer
     * @param fullClassName
     * @returns {XML|void|string|*}
     * @private
     */
    _getShortClassName(fullClassName){
        return fullClassName.replace(/.*\.(.*)/i,"$1");
    }

    _doLogin(request){
        this._loginDeferred = Q.defer();
        // Wait for an out of band push from gateway to resolve
        this.on('com.percero.agents.sync.vo.ConnectResponse', () => this._loginDeferred.resolve(this.userToken) );

        this._sendMessage('authenticate', request)
            .then((response)=>{
            var userToken = response.result;
            // Save the userToken
            if(userToken)
                this.userToken = userToken;
            else
                this._loginDeferred.resolve();
        });

        return this._loginDeferred.promise;
    }

    /**
     * socket 'connect' message handler
     * @private
     */
    _onConnected(){
        this.connected = true;

        var connectRequest = {connect: {ensureMessageDelivery: true}};
        this._socket.emit('message', connectRequest);
    }

    /**
     * socket 'disconnect' message handler
     * @private
     */
    _onDisconnected(){
        this.connected = false;
        this.emit('disconnected');
    }

    /**
     * socket 'push' message handler
     * @param message
     * @private
     */
    _onPush(message){
        var pendingResponse = this.pendingResponses[message.correspondingMessageId];
        if(pendingResponse){
            pendingResponse.deferred.resolve(message);
        }

        this.emit(message.cn, message);
    }

    /**
     * socket 'gatewayConnectAck' message handler
     * @private
     */
    _onGatewayConnectAck(message){
        this._addStat('gatewayConnectAck');

        var updates = message.split(';')[0];
        var jsonString = new Buffer(updates, 'base64').toString();
        this.session = JSON.parse(jsonString);

        // Possible to get several of these so only use the first one
        if(this._connectDeferred){
            this._connectDeferred.resolve();
            this._connectDeferred = null;
        }
    }

    /**
     * Sends a message to the gateway
     * @param type
     * @param message
     * @param meta - optional data to be appended to stats
     * @returns {*|promise}
     * @private
     */
    _sendMessage(type, message, meta){
        var deferred = Q.defer();
        var startTime = new Date();

        message.clientId = this.session.clientId;
        message.messageId = uuid.v4();

        this.pendingResponses[message.messageId] = {
            deferred: deferred,
            requestTime: new Date().getTime()
        };

        // Add a then here to track the stats
        deferred.promise.then((response) => {
            var endTime = new Date();
            this._addStat(this._getShortClassName(response.cn)+(meta?"("+meta+")":''), startTime, endTime);
            return response; // Return the response so the next then gets the response too
        });

        this._socket.emit(type, message);
        this._addStat(this._getShortClassName(message.cn)+(meta?"("+meta+")":''));
        return deferred.promise;
    }

    /**
     * Keep track of the kinds of calls that were made and the length of time we waited for responses
     * @param kind
     * @param startTime - optional
     * @param endTime   - optional
     */
    _addStat(kind, startTime, endTime){
        // Not all stats will have a wait time
        if(startTime && endTime)
            this.stats.addEvent(kind, endTime.getTime() - startTime.getTime());
        else
            this.stats.addEvent(kind, 0);
    }
}

module.exports = LoaderClient;



