'use strict';
/* var cities = [
    {"name": "New York", "occurrence": 3, "color": "blue"},
    {"name": "London", "occurrence": 3, "color": "blue"},
    {"name": "Buenos Aires", "occurrence": 2, "color": "yellow"}
];*/


function State(cities) {
    var i, j;
    this.discard = [];
    this.deck = [[]];
	this.cities = [];
//    this.cities = cities.map(function (c) {return c.name; });
	console.log(cities);
	console.log(this.cities);
    for (i = 0; i < cities.length; i++) {
	this.cities.push(cities[i].name);
        for (j = 0; j < cities[i].multiplicity; j++) {
            this.deck[0].push(cities[i].name);
		console.log(cities[i].name);
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
    this.Query = function (cards) {
        var i, j, expValues = {};
        for (i = 0; i < cities.length; i++) {
            expValues[cities[i].name] = 0;
        }
        j = this.deck.length - 1;
	console.log(this);
	console.log(j);
        while (cards > this.deck[j].length) {
            cards -= this.deck[j].length;
            for (i = 0; i < this.deck[j].length; i++) {
                expValues[this.deck[j][i]]++;
            }
            if (j < 0) {
                return "too many cards";
            }
            j--;
        }
        console.log(expValues);
        for (i = 0; i < this.deck[j].length; i++) {
            expValues[this.deck[j][i]] += 1.*cards/this.deck[j].length;
        }
        console.log(expValues);
        return expValues;
    };
}
var app = angular.module('pandemic',[]);;
/*
function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

httpGetAsync('https://uz.sns.it/~giove/pandemic/deck/',
            function (data) {
    cities = JSON.parse(data);
    console.log(cities);
});*/
app.controller('calculator', function($scope, $http) {
    $http.get('https://uz.sns.it/~giove/pandemic/deck/').then(
        function (response) {
            $scope.cities = response.data;
            $scope.state = new State($scope.cities);
//		$scope.lastState = JSON.parse(JSON.stringify($scope.state);
            $scope.next = $scope.state.Query(1);
            console.log($scope.next);
		$scope.epidemic = false;
		$scope.clickcity = function (city) {
			if ($scope.epidemic) {
//				$scope.lastState = JSON.parse(JSON.stringify($scope.state);
				$scope.state.Epidemic(city);
				$scope.epidemic = false;
			}
			else {
//				$scope.lastState = JSON.parse(JSON.stringify($scope.state);
				$scope.state.Infect(city);
			}
		};
		$scope.infectrate = 2;
		/*$scope.undo = function () {
			$scope.state = JSON.parse(JSON.stringify($scope.lastState));
		};*/
        });
});
//mystate = new State(cities);

/*
mystate.Infect("New York");
mystate.Infect("New York");
mystate.Infect("Buones Aires");
mystate.Epidemic("London");
mystate.Infect("London");
mystate.Epidemic("London");
console.log(mystate);
//console.log(JSON.stringify(mystate));
*/
