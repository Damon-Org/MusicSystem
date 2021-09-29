import Modules from '@/src/Modules.js'

export default class RepeatPlaylist extends Modules.music.MusicCommand {
    /**
     * @param {string} category
     * @param {Main} main
     */
    constructor(category, main) {
        super(main);

        this.register(RepeatPlaylist, {
            category: category,
            guild_only: true,

            name: 'repeat playlist',
            aliases: [
                'repeatplaylist',
                'repplaylist',
                'rep playlist',
                'playlist repeat',
                'playlist rep',
                'playlistrep',
                'playlistrepeat',
                'repeat queue',
                'repeatqueue',
                'queue repeat',
                'queuerep',
                'rq',
                'r q',
                'rp',
                'r p'
            ],
            description: 'The entire queue is looped, when the end of the queue is reached it starts over.',
            usage: 'repeat playlist',
            params: [],
            example: 'repeatplaylist'
        });
    }

    /**
     * @param {string} trigger string representing what triggered the command
     */
    run(trigger) {
        if (this.music.isDamonInVC(this.voiceChannel)) {
            if (this.music.repeatQueueToggle()) {
                this.send('Playlist repeat has been **enabled**.');

                return true;
            }

            this.send('Playlist repeat has been **disabled**.');

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => setTimeout(msg.delete, 5e3));

        return true;
    }
}
