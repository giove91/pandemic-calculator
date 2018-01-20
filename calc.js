'use strict';
var cities = [
    {"name": "New York", "occurrence": 3, "color": "blue"},
    {"name": "London", "occurrence": 3, "color": "blue"},
    {"name": "Buenos Aires", "occurrence": 2, "color": "yellow"}
];

function State(cities) {
    var i, j;
    this.discard = [];
    this.deck = [[]];
    this.cities = cities.map(function (c) {return c.name; });
    for (i = 0; i < cities.length; i++) {
        for (j = 0; j < cities[i].occurrence; j++) {
            this.deck[0].push(cities[i].name);
        }
    }
    this.Infect = function (city) {
        var lastStack = this.deck.length - 1,
            index = this.deck[lastStack].indexOf(city);
        if (index === -1) {
            return "not found";
        }
        this.deck[lastStack].splice(index, 1);
        if (this.deck[lastStack].length === 0) {
            this.deck.pop();
        }
        this.discard.push(city);
    };
    this.Epidemic = function (city) {
        var index = this.deck[0].indexOf(city);
        if (index === -1) {
            return "not found";
        }
        this.deck[0].splice(index, 1);
        if (this.deck[0].length === 0) {
            this.deck.shift();
        }
        this.discard.push(city);
        this.deck.push(this.discard);
        this.discard = [];
    };
}

var mystate = new State(cities);
mystate.Infect("New York");
mystate.Infect("New York");
mystate.Infect("Buones Aires");
mystate.Epidemic("London");
mystate.Infect("London");
mystate.Epidemic("London");
console.log(mystate);
//console.log(JSON.stringify(mystate));