import humanReadableTime from 'humanize-duration'

export default class MusicShutdown {
    /**
     * @param {MusicSystem} music
     */
    constructor(music) {
        this.music = music;
    }

    cancel() {
        this.reset();

        if (this.shutdownMsg) this.shutdownMsg.then(msg => msg.delete());
        this.shutdownMsg = null;
    }

    delay(type, timeout) {
        if (this._timeout) clearTimeout(this._timeout);
        this._type = type;

        if (type == 'time')
            this.shutdownMsg = this.music.channel.send(`The queue will be destroyed within ${humanReadableTime(timeout)}, rejoin within that time to resume music playback.`);

        this._timeout = setTimeout(() => {
            this.instant();
        }, timeout);
    }

    instant() {
        this.reset();

        this.music.reset(true);
    }

    type() {
        return this._type;
    }

    reset() {
        if (this._timeout) clearTimeout(this._timeout);

        this._timeout = null;
        this._type = null;
    }
}
