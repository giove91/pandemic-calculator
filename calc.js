'use strict';

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
        this.infectRate.shift();
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

