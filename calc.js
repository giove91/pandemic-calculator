'use strict';

// Object that helps odd calculation
function CityCalc() {
    // the last is the discard pile
    this.deck = [];
    this.cdeck = [];
    this.Copy = function () {
        var cc = new CityCalc();
        cc.deck = this.deck.slice();
        cc.cdeck = this.cdeck.slice();
        return cc;
    };
    this.SingleEventOdds = function (event, times) {
        if (times < 0)
            return 0;
        // event = -1 means "Epidemic"
        if (event === -1) {
            if (times > 1)
                return 0;
            var odds = this.cdeck[0] / this.deck[0];
            if (times === 1)
                return odds;
            else
                return 1 - odds;
        }
        // event >= 0 means "Draw event cards"
        var l = this.deck.length - 2;
        if (event >= this.deck[l]) {
            // there is no enough cards to draw
            if (l === 0)
                return 0;
            var cc = this.Copy();
            cc.deck.splice(l, 1);
            cc.cdeck.splice(l, 1);
            return cc.SingleEventOdds(event - this.deck[l], times - this.cdeck[l]);
        }
        // at most this.cdeck[l] or event cards can be drawn
        if (times > this.cdeck[l] || times > event)
            return 0;
        // last simple case with binomial coefficients
        return binom.get(this.deck[l] - this.cdeck[l], event - times)
            * binom.get(this.cdeck[l], times)
            / binom.get(this.deck[l], event);
    };
    this.Change = function (event, times) {
        var l;
        if (times < 0)
            return -1; // error
        // event = -1 means "Epidemic"
        if (event === -1) {
            if (times > 1)
                return -1; // error
            if (this.cdeck[0] < times)
                return -1; // error
            
            this.deck[0] -= 1;
            this.cdeck[0] -= times;
            l = this.deck.length - 1;
            this.deck[l] += 1;
            this.cdeck[l] += times;
            this.deck.push(0);
            this.cdeck.push(0);
            return 0; // no error
        }
        // event >= 0 means "Draw event cards"
        l = this.deck.length - 2;
        if (event >= this.deck[l]) {
            var pcards = this.deck[l],
                ptimes = this.cdeck[l];
            this.deck[l+1] += this.deck[l];
            this.cdeck[l+1] += this.cdeck[l];
            this.deck.splice(l,1);
            this.cdeck.splice(l,1);
            return this.Change(event - pcards, times - ptimes);
        }
        if (times > this.cdeck[l] || times > event)
            return -1; // error
        
        this.deck[l+1] += event;
        this.cdeck[l+1] += times;
        this.deck[l] -= event;
        this.cdeck[l] -= times;
        return 0; // no error
    }
    this.ListEventsOdds = function (eventList, times) {
        var i,
            odds = 0,
            scc,
            sodds;
        // no events
        if (eventList.length === 0) {
            if (times === 0)
                return 1;
            return 0;
        }
        // single event
        if (eventList.length === 1)
            return this.SingleEventOdds(eventList[0], times);
        // more events, recursion
        for (i = 0; i <= times; i++) {
            sodds = this.SingleEventOdds(eventList[0], i);
            if (sodds > 0) {
                scc = this.Copy();
                if (scc.Change(eventList[0],i) != 0)
                    continue;
                odds += sodds * scc.ListEventsOdds(eventList.slice(1, eventList.length), times - i);
            }
        }
        return odds;
    }
}

// Global state of the game
function State(cities) {
    // initialization
    var i, j;
    this.discard = [];
    this.deck = [[]];
    this.infectCards = 0;
    this.cities = [];
    this.playerDeck = [];
    this.infectRate = [2, 2, 2, 3, 3, 4, 4, 4];
    this.isThereEpidemic = true;
    this.toInfect = 9;
    for (i = 0; i < cities.length; i++) {
        this.cities.push(cities[i].name);
        for (j = 0; j < cities[i].multiplicity; j++) {
            this.deck[0].push(cities[i].name);
        }
        this.infectCards = this.deck[0].length;
    }
    // infect the first city on the infect deck
    this.Infect = function (city) {
        var lastStack = this.deck.length - 1,
            index = this.deck[lastStack].indexOf(city);
        if (index === -1) {
            console.log("Infect city not found", city);
            return "not found";
        }
        if (this.toInfect === 0) {
            this.toInfect += this.infectRate[0];
            this.playerDeck[0] -= 2;
            if (this.playerDeck[0] <= 0) {
                this.isThereEpidemic = true;
                this.playerDeck[1] += this.playerDeck[0];
                this.playerDeck.shift();
            }
        }
        this.toInfect -= 1;
        this.deck[lastStack].splice(index, 1);
        if (this.deck[lastStack].length === 0) {
            this.deck.pop();
        }
        this.discard.push(city);
    };
    // infect the last city of the infect deck and add discard pile to the deck
    this.Epidemic = function (city) {
        var index = this.deck[0].indexOf(city);
        if (index === -1) {
            console.log("Epidemic city not found", city);
            return "not found";
        }
        this.deck[0].splice(index, 1);
        if (this.deck[0].length === 0) {
            this.deck.shift();
        }
        this.discard.push(city);
        this.discard.sort();
        this.deck.push(this.discard);
        this.discard = [];
        if (this.infectRate.length > 1) this.infectRate.shift();
        this.isThereEpidemic = false;
    };
    // inoculate the city "city", if it appear in the discard pile
    this.Inoculate = function (city) {
        var index = this.discard.indexOf(city);
        if (index === -1) {
            console.log("Inoculate city not found", city);
            return "not found";
        }
        this.discard.splice(index, 1);
    }
    // initialize the player deck (for epidemic odds calculation)
    this.InitPlayerDeck = function (playerCards, epidemicCards) {
        var stack;
        this.playerDeck = [];
        while (epidemicCards > 0) {
            stack = Math.ceil(playerCards / epidemicCards);
            this.playerDeck.push(stack + 1);
            playerCards -= stack;
            epidemicCards -= 1;
        }
    };
    // get the simplified object CityCalc concerning the city "city"
    this.GetCityCalc = function (city) {
        var i,
            cc = new CityCalc(),
            tc,
            Counter = function (item) {
                if (item === city) { tc++; }
            };
        for (i = 0; i < this.deck.length; i++) {
            cc.deck.push(this.deck[i].length);
            tc = 0;
            this.deck[i].forEach(Counter);
            cc.cdeck.push(tc);
        }
        cc.deck.push(this.discard.length);
        tc = 0;
        this.discard.forEach(Counter);
        cc.cdeck.push(tc);
        return cc;
    }
    // return the odds that the next epidemic happen after "turnsBefore" turns
    this.GetNextEpidemicOdds = function (turnsBefore) {
        var playerCards = 2,
            i, odds = 0,
            singleCardOdds = function (n, st) {
                if (st.isThereEpidemic) {
                    if (n > st.playerDeck[0])
                        return 0;
                    else
                        return 1 / st.playerDeck[0];
                }
                else {
                    if (n <= st.playerDeck[0] || n > st.playerDeck[0] + st.playerDeck[1])
                        return 0;
                    else
                        return 1 / st.playerDeck[1];
                }
            };
        for (i = 1; i <= playerCards; i++)
            odds += singleCardOdds(turnsBefore * playerCards + i, this);
        return odds;
    }
    // return the odds that the city "city" come out at least "times" times in the next "turns" turns supposing at most one epidemic can happen meantime
    this.GetEpidemicCityOdds = function (city, turns, times) {
        var i, j,
            lmb,
            odds = 0,
            oppodds,
            resEpidemic = 1,
            cc = this.GetCityCalc(city),
            eventList;
        for (i = 0; i < turns; i++) {
            // events list calculation
            if (i === 0)
                eventList = [-1, turns * this.infectRate[1]];
            else
                eventList = [i * this.infectRate[0], -1, (turns - i) * this.infectRate[1]];
            // odds that this list is the case
            lmb = this.GetNextEpidemicOdds(i);
            // odds that, with this list, city appear less than "times" times
            oppodds = 0;
            for (j = 0; j < times; j++)
                oppodds += cc.ListEventsOdds(eventList, j);
            // right odds
            odds += lmb * (1 - oppodds);
            // odds that neither this is the case
            resEpidemic -= lmb;
        }
        // the remaining case: epidemic does not appear
        eventList = [turns * this.infectRate[0]];
        oppodds = 0;
        for (j = 0; j < times; j++)
            oppodds += cc.ListEventsOdds(eventList, j);
        odds += resEpidemic * (1 - oppodds);
        return odds;
    }
}

// Save and Load functions
var saveKeys = ["deck", "infectCards", "discard", "cities", "playerDeck",
        "infectRate", "isThereEpidemic", "toInfect"];
function SaveState(state) {
    var save = {}, i;
    for (i = 0; i < saveKeys.length; i++)
        save[saveKeys[i]] = JSON.stringify(state[saveKeys[i]]);
    return save;
}
function LoadState(state, save) {
    var i;
    for (i = 0; i < saveKeys.length; i++)
        state[saveKeys[i]] = JSON.parse(save[saveKeys[i]]);
}

var app = angular.module('pandemic', []);

// Initi function for the 'pandemic' angular app
// data should contain the city cards description in the infection rate
function InitData($scope,data) {
    $scope.cities = data;
    // global game state
    $scope.state = new State($scope.cities);
    // game state history
    $scope.hist = [];
    // if the next clicked city means "epidemic"
    $scope.epidemic = false;
    // if the next clicked city means "inoculate"
    $scope.inoculate = false;
    // if the player deck definition is blocked (which means that the game already started)
    $scope.blockPlayerDeck = false;
    // function called by clicking the cities buttons
    $scope.ClickCity = function (city, $event) {
        $scope.blockPlayerDeck = true;
        $scope.hist.push(SaveState($scope.state));
        if ($scope.epidemic || $event.shiftKey) {
            $scope.state.Epidemic(city);
            $scope.epidemic = false;
        } else
        if ($scope.inoculate) {
            $scope.state.Inoculate(city);
            $scope.inoculate = false;
        } else {
            $scope.state.Infect(city);
        }
    };
    // data to display
    $scope.GetGrid = function (name, turns, atleast) {
        return ($scope.state.GetEpidemicCityOdds(name, turns, atleast)).toFixed(2)
    }
    // parameter with which order the table
    $scope.orderParameter = 'name';
    $scope.reverseOrder = false;
    // set parameter function
    $scope.SetOrderParameter = function (al, t) {
        if (typeof $scope.orderParameter === 'object'
            && $scope.orderParameter['atleast'] === al
            && $scope.orderParameter['turns'] === t)
            $scope.reverseOrder = ! $scope.reverseOrder;
        $scope.orderParameter = {atleast: al, turns: t};
    }
    // auxiliary function for table ordering
    $scope.OrderTable = function (city) {
        if (typeof $scope.orderParameter === 'object' && 'atleast' in $scope.orderParameter)
            return [$scope.state.GetEpidemicCityOdds(city.name, $scope.orderParameter.turns, $scope.orderParameter.atleast), city.name];
        return [city.color, city.name];
    }
    // undo the last draw
    $scope.Undo = function () {
        LoadState($scope.state, $scope.hist.pop());
    };
    // starting data for the player deck
    $scope.playerCards = 66;
    $scope.epidemicCards = 8;
    $scope.UpdatePlayerDeck = function () {
        if ($scope.blockPlayerDeck) return;
        $scope.state.InitPlayerDeck($scope.playerCards, $scope.epidemicCards)
    }
    $scope.UpdatePlayerDeck();
}

// angular app controller initialization
app.controller('calculator', function ($scope, $http) {
    $http.get('https://uz.sns.it/~giove/pandemic/deck/').then(
        function (response) {
            InitData($scope, response.data);
        }
    ).catch(
        function () {
            InitData($scope,[{"color": "blue", "multiplicity": 3, "name": "New York"}, {"color": "blue", "multiplicity": 2, "name": "Paris"}, {"color": "blue", "multiplicity": 2, "name": "San Francisco"}, {"color": "blue", "multiplicity": 3, "name": "Washington"}, {"color": "black", "multiplicity": 3, "name": "Cairo"}, {"color": "black", "multiplicity": 3, "name": "Istanbul"}, {"color": "black", "multiplicity": 3, "name": "Tripoli"}, {"color": "yellow", "multiplicity": 2, "name": "Bogot\u00e0"}]);
        }
    );
});

