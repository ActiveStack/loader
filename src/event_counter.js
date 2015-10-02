"use strict";

class EventCounter{
    constructor(){
        this.stats = {}
    }

    addEvent(name, time){
        if(!this.stats[name]){
            this.stats[name] = {
                count: 0,
                waitTime: 0
            };
        }

        this.stats[name].count++;
        this.stats[name].waitTime += time;
    }
}

module.exports = EventCounter;