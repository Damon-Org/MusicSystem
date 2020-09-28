export default class SpotifyTrack {
    /**
     * @param {Object} data Data found by the Spotify REST APi
     * @param {Main} main
     * @param {Object} imageOverride Image override for album art
     */
    constructor(data, main, imageOverride = null) {
        this._m = main;

        Object.assign(this, {
            artists: data.artists,
            album: data.album,
            name: data.name
        });

        this.cached = false;
        this._done = false;

        this.imageOverride = imageOverride;
    }

    get author() {
        return this.artists[0].name;
    }

    get full_author() {
        if (this._full_author) {
            return this._full_author;
        }

        let artist = '';

        for (let i = 0; i < this.artists.length; i++) {
            const tempArtist = this.artists[i];

            if (i == 0)
                artist += tempArtist.name;
            else if (i == 1)
                artist += ' (ft. ';

            if (i > 0) {
                artist += tempArtist.name;

                if (i+1 != this.artists.length)
                    artist += ', ';
                else
                    artist += ')';
            }
        }

        this._full_author = artist;

        return artist;
    }

    get image() {
        if (this.imageOverride) return this.imageOverride;
        return this.album.images[0].url;
    }

    get title() {
        return `${this.author} - ${this.name}`;
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
            search = await this._m.getModule('api').youtube.search(this.title);

            attempt++;
        } while ((!search || search.length == 0 || !search[0].id || typeof search !== 'object') && attempt < 3);

        if (!search || search.length == 0 || !search[0].id || typeof search !== 'object') {
            this.broken = true;

            return false;
        }

        let data = null;
        attempt = 0;
        do {
            data = await this._m.getModule('lavalink').conn.getNode().rest.resolve(`https://youtu.be/${search[0].id}`);

            attempt++;
        } while ((data == null || data === true || data.tracks.length == 0) && attempt < 3 );

        if (!data || data === true) {
            this.broken = true;

            return false;
        }

        this.track = data.tracks[0].track;

        this._m.log.info('API', `Cached song: ${this.title}`);

        if (this._done)
            this._done();

        this.cached = true;

        return true;
    }

    isSeekable() {
        return true;
    }
}
