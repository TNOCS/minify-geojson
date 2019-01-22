"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var stream_1 = require("stream");
var utils_1 = require("../../utils");
var PropertyFilter = (function (_super) {
    __extends(PropertyFilter, _super);
    function PropertyFilter(filterQuery) {
        var _this = _super.call(this, { objectMode: true }) || this;
        _this.filters = utils_1.convertQueryToPropertyFilters(filterQuery);
        return _this;
    }
    PropertyFilter.prototype._transform = function (geojson, encoding, done) {
        var pass = true;
        this.filters.some(function (f) {
            if (f(geojson.properties)) {
                return false;
            }
            pass = false;
            return true;
        });
        done(null, pass ? geojson : null);
    };
    return PropertyFilter;
}(stream_1.Transform));
exports.PropertyFilter = PropertyFilter;
//# sourceMappingURL=property-filter.js.map