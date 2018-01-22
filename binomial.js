'use strict';

var binom = {
    cache : [],
    extend : function (lastRow) {
        var i = this.cache.length;
        for (i = this.cache.length; i <= lastRow; i++) {
            this.cache.push(
                Array.apply(null, Array(i)).map(Number.prototype.valueOf, 0)
            );
        }
    },
    get : function (n, k) {
        if (n < k || k < 0)
            return 0;
        if (n === k || k === 0)
            return 1;
        if (n >= this.cache.length)
            this.extend(n);
        if (this.cache[n][k] === 0)
            this.cache[n][k] = this.get(n - 1, k - 1) + this.get(n - 1, k);
        return this.cache[n][k];
    }
}
