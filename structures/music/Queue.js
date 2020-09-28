export default class MusicQueue extends Array {
    constructor() {
        super();

        this.maxPrequeue = 50;

        this.maxQueue = 350;

        this.reset();
    }

    get start() {
        let start = this.maxPrequeue;

        do {
            if (this[start - 1] == null) return start;

            start--;
        } while (start > 0);

        return start;
    }

    /**
     * @returns {LavaTrack|SpotifyTrack} Active Song
     */
    active() {
        return this[this.maxPrequeue];
    }

    /**
     * @param {LavaTrack|SpotifyTrack} track Data found by the LavaLink REST APi
     * @returns {boolean} Returns true on success, false if queue is full
     */
    add(track) {
        if (this.length == this.maxQueue) return false;

        this.splice(this.length - 1, 0, track);

        return true;
    }

    /**
     * @param {Object} data Data found by the LavaLink REST APi
     * @param {number} position
     * @returns {boolean} Returns true on success, false if queue is full
     */
    addOnPosition(song, position) {
        if (this.length == this.maxLength) return false;

        if (position > 0) {
            position--;

            this.splice(this.maxPrequeue + position, 0, song)

            return true;
        }
        this.splice(this.maxPrequeue + position, 0, song);

        return true;
    }

    clear() {
        this.length = 0;
    }

    count() {
        return this.length - this.start;
    }

    /**
     * @param {number} position Position in queue
     * @returns {Object} data Data found by the LavaLink REST APi
     */
    getFromPosition(position) {
        if (position > 0) {
            position--;

            return this[this.maxPrequeue + position];
        }

        return this[this.maxPrequeue + position];
    }

    /**
     * @param {number} index
     */
    hasOnPosition(index) {
        if (this.getFromPosition(index)) {
            return true;
        }
        return false;
    }

    /**
     * Removes a song by the position in queue
     * @returns {boolean} False if the given position is invalid, true on success.
     */
    removeOnPosition(position) {
        position = parseInt(position);

        if (position > 0) {
            position--;
        }

        if (position == 0 || !this[this.maxPrequeue + position]) {
            return false;
        }

        this.splice(this.maxPrequeue + position, 1);

        if (position < 0) {
            this.unshift(null);
        }

        return true;
    }

    reset() {
        /**
         * Is repeat enabled
         * @type {boolean}
         */
        this.repeat = false;

        this.clear();

        for (let i = 0; i < (this.maxPrequeue + 1); i++) {
            this[i] = null;
        }
    }

    reverse() {
        const bottomLimit = this.start;
        const topLimit = this.length - 1;
        // this.slice would return Queue instead of primitive Array so we "cast" it to an Array below
        const tempQueue = [...this.slice(bottomLimit, topLimit)];

        tempQueue.reverse();

        this.splice(bottomLimit, topLimit - bottomLimit, ...tempQueue);
    }

    /**
     * Will rewind till the first song in queue
     */
    rewind() {
        while (this.getFromPosition(-1) != null) {
            this.unshift(null);
        }
    }

    /**
     * Shuffles the queue without any priority
     */
    shuffle() {
        const bottomLimit = this.start;
        const topLimit = this.length - 1;

        let tempQueue = this.slice(bottomLimit, topLimit);
        let currentIndex = tempQueue.length - 1;
        let temporaryValue, randomIndex;

        while (0 !== currentIndex) {
            if (currentIndex === (this.maxPrequeue - bottomLimit)) {
                currentIndex--;
                continue;
            }

            do {
                randomIndex = Math.round(Math.random() * currentIndex);
            } while (randomIndex === (this.maxPrequeue - bottomLimit))

            temporaryValue = tempQueue[currentIndex];
            tempQueue[currentIndex] = tempQueue[randomIndex];
            tempQueue[randomIndex] = temporaryValue;

            currentIndex--;
        }

        this.splice(bottomLimit, topLimit - bottomLimit, ...tempQueue);
    }
}
