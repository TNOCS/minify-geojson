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
var stream_1 = require("stream");
var PruneEmptyProperties = (function (_super) {
    __extends(PruneEmptyProperties, _super);
    function PruneEmptyProperties() {
        var _this = _super.call(this, { objectMode: true }) || this;
        _this.count = 0;
        return _this;
    }
    PruneEmptyProperties.prototype._transform = function (geojson, encoding, done) {
        this.count++;
        for (var key in geojson.properties) {
            if (!geojson.properties.hasOwnProperty(key))
                continue;
            if (!geojson.properties[key])
                delete geojson.properties[key];
        }
        done(null, geojson);
    };
    return PruneEmptyProperties;
}(stream_1.Transform));
exports.PruneEmptyProperties = PruneEmptyProperties;
//# sourceMappingURL=prune-empty-properties.js.map