import MusicCommand from '../../../structures/commands/MusicCommand.js'

export default class RepeatPlaylist extends MusicCommand {
    /**
     * @param {String} category
     * @param {Array<*>} args
     */
    constructor(category, ...args) {
        super(...args);

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
     * @param {String} command string representing what triggered the command
     */
    async run(command) {
        if (this.music.isDamonInVC(this.voiceChannel)) {
            if (this.music.repeatQueueToggle()) {
                this.send('Playlist repeat has been **enabled**.');

                return true;
            }

            this.send('Playlist repeat has been **disabled**.');

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => msg.delete({timeout: 5e3}));

        return true;
    }
}
