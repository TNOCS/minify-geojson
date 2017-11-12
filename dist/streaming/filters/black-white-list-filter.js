"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var stream = require("stream");
var BlackWhiteListFilter = (function (_super) {
    __extends(BlackWhiteListFilter, _super);
    function BlackWhiteListFilter(whitelist, blacklist) {
        var _this = _super.call(this, { objectMode: true }) || this;
        if (whitelist)
            _this.whitelist = whitelist.map(function (i) { return i.trim(); });
        if (blacklist)
            _this.blacklist = blacklist.map(function (i) { return i.trim(); });
        return _this;
    }
    BlackWhiteListFilter.prototype._transform = function (geojson, encoding, done) {
        for (var key in geojson.properties) {
            if (!geojson.properties.hasOwnProperty(key))
                continue;
            if (this.whitelist && this.whitelist.indexOf(key) >= 0)
                continue;
            if (this.blacklist && this.blacklist.indexOf(key) < 0)
                continue;
            delete geojson.properties[key];
        }
        done(null, geojson);
    };
    return BlackWhiteListFilter;
}(stream.Transform));
exports.BlackWhiteListFilter = BlackWhiteListFilter;
//# sourceMappingURL=black-white-list-filter.js.map