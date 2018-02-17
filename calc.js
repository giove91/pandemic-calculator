'use strict';

function CityCalc() {
    // the last is the discard pile
    this.deck = [0, 0];
    this.cdeck = [0, 0];
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
            var l = this.deck.length - 1;
            this.deck[l] += 1;
            this.cdeck[l] += times;
            this.deck.push(0);
            this.cdeck.push(0);
            return 0; // no error
        }
        // event >= 0 means "Draw event cards"
        var l = this.deck.length - 2;
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
        // [DEBUG] console.log("events", this.deck, this.cdeck, eventList, times)
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

function State(cities) {
    var i, j;
    this.discard = [];
    this.deck = [[]];
    this.infectCards = 0;
    this.cities = [];
    this.playerDeck = [];
    this.infectRate = [2, 2, 2, 3, 3, 4, 4];
    this.isThereEpidemic = true;
    this.toInfect = 9;
    for (i = 0; i < cities.length; i++) {
        this.cities.push(cities[i].name);
        for (j = 0; j < cities[i].multiplicity; j++) {
            this.deck[0].push(cities[i].name);
        }
        this.infectCards = this.deck[0].length;
    }
    this.Infect = function (city) {
        var lastStack = this.deck.length - 1,
            index = this.deck[lastStack].indexOf(city);
        if (index === -1) {
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
        this.discard.sort();
        this.deck.push(this.discard);
        this.discard = [];
        if (this.infectRate.length > 1) this.infectRate.shift();
        this.isThereEpidemic = false;
    };
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
    this.GetStackIndexAndRemainder = function (cards) {
        var j = this.deck.length - 1;
        while (cards > this.deck[j].length && j >= 0) {
            cards -= this.deck[j].length;
            j -= 1;
        }
        return {'index': j, 'remainder': cards};
    };
    this.GetCityOdds = function (cards, city, times) {
        var i,
            min = 0,
            dev = 0,
            oppOdds = 0,
            indRem = this.GetStackIndexAndRemainder(cards),
            rim = this.deck[indRem.index].length,
            Counter = function (item) {
                if (item === city) { min++; }
            };
        for (i = indRem.index + 1; i < this.deck.length; i++) {
            this.deck[i].forEach(Counter);
        }
        if (times <= min) {
            return 1;
        }
        times -= min;
        this.deck[indRem.index].forEach(function (item) {
            if (item === city) { dev++; }
        });
        for (i = 0; i < times; i++) {
            oppOdds += binom.get(dev, i) * binom.get(rim - dev, indRem.remainder - i);
        }
        return 1 - oppOdds / binom.get(rim, indRem.remainder);
    };
    this.GetCityOddsNever = function (city, draws) {
        var i,
            bad = 0,
            indRem = this.GetStackIndexAndRemainder(draws),
            dubts = this.deck[indRem.index].length;
        for (i = indRem.index + 1; i < this.deck.length; i++) {
            if (this.deck[i].indexOf(city) > -1)
                return 0;
        }
        this.deck[indRem.index].forEach(function (item) {
            if (item === city) { bad++; }
        });
        return binom.get(dubts - bad, indRem.remainder) / binom.get(dubts, indRem.remainder);
    }
    this.GetCityOddsNThenEpidemic = function (city, draws) {
        var i,
            bad = 0,
            badBottom = 0,
            indRem = this.GetStackIndexAndRemainder(draws),
            dubts = this.deck[indRem.index].length,
            dubtsBottom = this.deck[0].length;
        for (i = indRem.index + 1; i < this.deck.length; i++) {
            if (this.deck[i].indexOf(city) > -1)
                return 0;
        }
        this.deck[indRem.index].forEach(function (item) {
            if (item === city) { bad++; }
        });
        this.deck[0].forEach(function (item) {
            if (item === city) { badBottom++; }
        });
        if (indRem.index === 0) {
            indRem.remainder += 1;
            return binom.get(dubts - bad, indRem.remainder) / binom.get(dubts, indRem.remainder);
        }
        else {
            return binom.get(dubts - bad, indRem.remainder) / binom.get(dubts, indRem.remainder)
                * (dubtsBottom - badBottom) / dubtsBottom;
        }
    }
    this.GetStackIndexAndRemainderAfterEpidemic = function (cards, preDraws) {
        var j = this.deck.length;
        if (cards <= preDraws + this.discard.length + 1)
            return {'index': j, 'remainder': cards};
        else {
            cards -= preDraws + this.discard.length + 1;
            j -= 1;
        }
        while (cards > this.deck[j].length && j >= 0) {
            cards -= this.deck[j].length;
            j -= 1;
        }
        return {'index': j, 'remainder': cards};
    };
    this.GetCityOddsNAfterEpidemicEscaped = function (city, preDraws, postDraws) {
        return 1;
/*        var i,
            bad = 0,
            dubts,
            indRem = this.GetStackIndexAndRemainderAfterEpidemic(postDraws, preDraws);
        for (i = indRem.index + 1; i < this.deck.length; i++) {
            if (this.deck[i].indexOf(city) > -1)
                return 0;
        }
        if (indRem.index < this.deck.length) {
            if (this.discard.indexOf(city) > -1)
                return 0;
            dubts = this.deck[indRem.index].length;
            this.deck[indRem.index].forEach(function (item) {
                if (item === city) { bad++; }
            });
        }
        else {
            dubts = this.discard.length + preDraws + 1;
            this.discard.forEach(function (item) {
                if (item === city) { bad++; }
            });
        }
        return binom.get(dubts - bad, indRem.remainder) / binom.get(dubts, indRem.remainder);*/
    }
    this.GetNextEpidemicOdds = function (turnsBefore) {
        var playerCards = 2,
            i, odds = 0,
            singleCardOdds = function (n) {
                if (this.isThereEpidemic) {
                    if (n > this.playerDeck[0])
                        return 0;
                    else
                        return 1 / this.playerDeck[0];
                }
                else {
                    if (n <= this.playerDeck[0] || n > this.playerDeck[0] + this.playerDeck[1])
                        return 0;
                    else
                        return 1 / this.playerDeck[1];
                }
            };
        for (i = 1; i <= playerCards; i++)
            odds += singleCardOdds(turnsBefore * playerCards + i);
        return odds;
    }
    this.GetEpidemicCityOdds = function (city, turns) {
        var i, lmb,
            odds = 0,
            resEpidemic = 1;
        for (i = 0; i < turns; i++) {
            lmb = this.GetNextEpidemicOdds(i);
            odds += lmb * (1 -
                           this.GetCityOddsNThenEpidemic(city, i * this.infectRate[0]) *
                           this.GetCityOddsNAfterEpidemicEscaped(city, i * this.infectRate[0], (turns - i) * this.infectRate[1])
                          );
            resEpidemic -= lmb;
        }
        odds += resEpidemic * (1 - this.GetCityOddsNever(city, turns * this.infectRate[0]));
        return odds;
    }
}

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

function InitData($scope,data) {
    $scope.cities = data;
    $scope.state = new State($scope.cities);
    $scope.hist = [];
    $scope.epidemic = false;
    $scope.blockPlayerDeck = false;
    $scope.ClickCity = function (city, $event) {
        $scope.blockPlayerDeck = true;
        $scope.hist.push(SaveState($scope.state));
        if ($scope.epidemic || $event.shiftKey) {
            $scope.state.Epidemic(city);
            $scope.epidemic = false;
        } else {
            $scope.state.Infect(city);
        }
    };
    $scope.GetGrid = function (turns, atleast, name) {
        return ($scope.state.GetCityOdds(turns * $scope.state.infectRate[0], name, atleast)).toFixed(2)
    }
    $scope.orderParameter = 'name';
    $scope.OrderTable = function (city) {
        if (typeof $scope.orderParameter === 'object' && 'atleast' in $scope.orderParameter)
            return [$scope.state.GetCityOdds($scope.orderParameter.turns * $scope.state.infectRate[0], city.name, $scope.orderParameter.atleast), city.name];
        return [city.color, city.name];
    }
    $scope.infectrate = 2;
    $scope.undo = function () {
        LoadState($scope.state, $scope.hist.pop());
    };
    $scope.playercards = 66;
    $scope.epidemiccards = 8;
    $scope.updateplayerdeck = function () {
        if ($scope.blockPlayerDeck) return;
        $scope.state.InitPlayerDeck($scope.playercards, $scope.epidemiccards)
    }
    $scope.updateplayerdeck();
    
/*  [DEBUG] Test case
    var cccc = new CityCalc();
    cccc.deck[0] = 4;
    cccc.cdeck[0] = 2;
    var elist = [1,-1,2,-1];
    var I;
    for (I = 0; I<=5; I++) {
        console.log(" --- ", I, " --- ");
        console.log(cccc.ListEventsOdds(elist,I));
    }*/
}


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

