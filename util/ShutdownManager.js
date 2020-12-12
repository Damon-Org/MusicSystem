export default class ShutdownManager {
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

    delay(type, timeout, callback = null) {
        if (this._timeout) clearTimeout(this._timeout);
        this._type = type;

        return new Promise((resolve, reject) => {
            this._timeout = setTimeout(() => {
                if (typeof callback === 'function') callback();

                this.instant();
            }, timeout);
        });
    }

    instant() {
        this.reset();

        this.system.reset(true);
    }

    reset() {
        if (this._timeout) clearTimeout(this._timeout);

        this._timeout = null;
        this._type = null;
    }
}
