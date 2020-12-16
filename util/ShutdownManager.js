export default class ShutdownManager {
    _args = [];
    _call = null;
    _timeout = null;
    _type = null;

    /**
     * @param {Object} system
     */
    constructor(system) {
        this.system = system;
    }

    get type() {
        return this._type;
    }

    cancel() {
        this.reset();
    }

    delay(type, timeout, callback = null, ...args) {
        if (callback) this._call = callback;
        if (args) this._args = args;

        if (this._timeout) clearTimeout(this._timeout);
        this._type = type;

        return new Promise((resolve, reject) => {
            this._timeout = setTimeout(() => {
                this.instant();
            }, timeout);
        });
    }

    instant() {
        this.reset();

        this.system.reset(true);
    }

    reset() {
        if (typeof this._call === 'function') this._call(...this._args);
        if (this._timeout) clearTimeout(this._timeout);

        this._args = [];
        this._call = null;
        this._timeout = null;
        this._type = null;
    }
}
