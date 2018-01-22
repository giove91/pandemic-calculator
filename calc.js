'use strict';

function State(cities) {
    var i, j;
    this.discard = [];
    this.deck = [[]];
    this.cities = [];
    for (i = 0; i < cities.length; i++) {
        this.cities.push(cities[i].name);
        for (j = 0; j < cities[i].multiplicity; j++) {
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
        this.discard.sort();
        this.deck.push(this.discard);
        this.discard = [];
    };
    this.GetStackIndexAndRemainder = function (cards) {
        var j = this.deck.length - 1;
        while (cards > this.deck[j].length && j >= 0) {
            cards -= this.deck[j].length;
            j--;
        }
        return {'index': j, 'remainder': cards};
    };
    this.GetCityOdds = function (cards, city, times) {
        var i,
            min = 0,
            dev = 0,
            oppOdds = 0,
            indRem = this.GetStackIndexAndRemainder(cards),
            rim = this.deck[indRem.index].length;
        for (i = indRem.index + 1; i < this.deck.length; i++) {
            this.deck[i].forEach(function (item, index) {
               if (item === city) { min++; }
            });
        }
        if (times <= min) {
            return 1;
        }
        times -= min;
        this.deck[indRem.index].forEach(function (item, index) {
            if (item === city) { dev++; }
        });
        for (i = 0; i < times; i++) {
            oppOdds += binom.get(dev, i) * binom.get(rim - dev, indRem.remainder - i);
        }
        return 1 - oppOdds / binom.get(rim, indRem.remainder);
    };
}
var app = angular.module('pandemic', []);

app.controller('calculator', function ($scope, $http) {
    $http.get('https://uz.sns.it/~giove/pandemic/deck/').then(
        function (response) {
            $scope.cities = response.data;
            $scope.state = new State($scope.cities);
            $scope.histd = [];
            $scope.hists = [];
            $scope.next = $scope.state.Query(1);
            $scope.epidemic = false;
            $scope.clickcity = function (city) {
                $scope.histd.push(JSON.stringify($scope.state.deck));
                $scope.hists.push(JSON.stringify($scope.state.discard));
                if ($scope.epidemic) {
                    $scope.state.Epidemic(city);
                    $scope.epidemic = false;
                } else {
                    $scope.state.Infect(city);
                }
            };
            $scope.infectrate = 2;
            $scope.undo = function () {
                $scope.state.deck = JSON.parse($scope.histd.pop());
                $scope.state.discard = JSON.parse($scope.hists.pop());
            };
        }
    );
});

