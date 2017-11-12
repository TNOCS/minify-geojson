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
var SimplifyKeys = (function (_super) {
    __extends(SimplifyKeys, _super);
    function SimplifyKeys() {
        var _this = _super.call(this, { objectMode: true }) || this;
        _this.keys = {};
        _this.reversedKeys = {};
        _this.lastKey = 1;
        return _this;
    }
    Object.defineProperty(SimplifyKeys.prototype, "keyMap", {
        get: function () { return { map: this.reversedKeys }; },
        enumerable: true,
        configurable: true
    });
    SimplifyKeys.prototype._transform = function (geojson, encoding, done) {
        geojson.properties = this.minifyPropertyKeys(geojson.properties);
        done(null, geojson);
    };
    SimplifyKeys.prototype._flush = function (done) {
        console.log('Key map:');
        console.log(JSON.stringify(this.reversedKeys, null, 2));
        done(null, {});
    };
    SimplifyKeys.prototype.minifyPropertyKeys = function (props) {
        var newProps = {};
        for (var key in props) {
            var replace = void 0;
            if (this.keys.hasOwnProperty(key)) {
                replace = this.keys[key];
            }
            else {
                replace = this.smartKey(key);
                if (!replace) {
                    do {
                        replace = this.convertToNumberingScheme(this.lastKey++);
                    } while (this.reversedKeys.hasOwnProperty(replace));
                }
                this.keys[key] = replace;
                this.reversedKeys[replace] = key;
            }
            newProps[replace] = props[key];
        }
        return newProps;
    };
    SimplifyKeys.prototype.smartKey = function (key) {
        var id = 'id';
        key = key.toLowerCase();
        if (key === id) {
            if (!this.reversedKeys.hasOwnProperty(id)) {
                return id;
            }
        }
        var replace = key.trim()[0];
        return this.reversedKeys.hasOwnProperty(replace) ? undefined : replace;
    };
    SimplifyKeys.prototype.convertToNumberingScheme = function (counter) {
        var baseChar = ('a').charCodeAt(0);
        var letters = '';
        do {
            counter -= 1;
            letters = String.fromCharCode(baseChar + (counter % 26)) + letters;
            counter = (counter / 26) >> 0;
        } while (counter > 0);
        return letters;
    };
    return SimplifyKeys;
}(stream.Transform));
exports.SimplifyKeys = SimplifyKeys;
//# sourceMappingURL=simplify-keys.js.map