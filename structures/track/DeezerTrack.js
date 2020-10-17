export default class DeezerTrack {
    /**
     * @param {Object} data Data found by the LavaLink REST APi
     */
    constructor(data, main) {
        this._m = main;

        Object.assign(this, {
            artists: data.artist.name,
            cover: data.cover_medium ?? data.album?.cover_medium,
            name: data.title
        });

        this.cached = false;
        this._done = false;
    }

    get author() {
        return this.artists;
    }

    get image() {
        return this.cover;
    }

    get title() {
        return `${this.artists} - ${this.name}`;
    }

    get full_author() {
        const _contributors = [];

        this.contributors.forEach(contributor => _contributors.push(contributor.name));

        return _contributors.join(', ');
    }

    done() {
        return new Promise((resolve, reject) => {
            if (this.cached) {
                resolve(true);

                return;
            }

            const timeout = setTimeout(() => {
                resolve(false);

                this._done = false;
            }, 2e4);

            this._done = () => {
                resolve(true);

                clearTimeout(timeout);
            };
        });
    }

    async getYouTubeEquiv() {
        if (this.cached) return true;
        if (this.caching)
            return this.done();

        this.caching = true;

        let
            attempt = 0,
            search = null;

        do {
            search = await this._m.modules.api.youtube.search(`${this.name} ${this.artists}`);

            attempt++;
        } while ((!search || search.length == 0 || !search[0].id || typeof search !== 'object') && attempt < 3);

        if (!search || search.length == 0 || !search[0].id || typeof search !== 'object') {
            this.broken = true;

            return false;
        }

        let data = null;
        attempt = 0;
        do {
            data = await this._m.modules.lavalink.conn.getNode().rest.resolve(`https://youtu.be/${search[0].id}`);

            attempt++;
        } while ((data == null || data === true || data.tracks.length == 0) && attempt < 3 );

        if (!data || data === true) {
            this.broken = true;

            return false;
        }

        this.track = data.tracks[0].track;

        this._m.log.info('API', `Cached song: ${this.name}`);

        if (this._done)
            this._done();

        this.cached = true;

        return true;
    }

    isSeekable() {
        return true;
    }
}
