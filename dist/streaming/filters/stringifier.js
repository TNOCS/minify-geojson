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
var Stringifier = (function (_super) {
    __extends(Stringifier, _super);
    function Stringifier(simplifier) {
        var _this = _super.call(this, {
            objectMode: true,
            final: function (done) {
                _this.push(']');
                if (simplifier && simplifier.keyMap && Object.keys(simplifier.keyMap.map).length > 0) {
                    _this.push(',"map":' + JSON.stringify(simplifier.keyMap.map));
                }
                _this.push('}');
                done(null);
            },
        }) || this;
        _this.firstTime = true;
        return _this;
    }
    Stringifier.prototype._transform = function (geojson, encoding, done) {
        if (this.firstTime) {
            this.firstTime = false;
            this.push(JSON.stringify(geojson));
        }
        else {
            this.push(',' + JSON.stringify(geojson));
        }
        done();
    };
    return Stringifier;
}(stream_1.Transform));
exports.Stringifier = Stringifier;
//# sourceMappingURL=stringifier.js.map