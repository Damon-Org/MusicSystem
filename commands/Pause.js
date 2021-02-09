import MusicCommand from '../../../structures/commands/MusicCommand.js'

export default class Pause extends MusicCommand {
    /**
     * @param {String} category
     * @param {Array<*>} args
     */
    constructor(category, ...args) {
        super(...args);

        this.register(Pause, {
            category: category,
            guild_only: true,

            name: 'pause',
            aliases: [],
            description: 'Pause music playback, use d!resume to resume playback.',
            usage: 'pause',
            params: [],
            example: 'pause'
        });
    }

    /**
     * @param {String} command string representing what triggered the command
     */
    async run(command) {
        if (this.music.isDamonInVC(this.voiceChannel)) {
            if (this.music.pausePlayback()) {
                this.send('Music playback has been paused.');

                return true;
            }

            this.reply('music is already paused, use `resume` command to continue playing.')
                .then(msg => msg.delete({timeout: 5e3}));

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => msg.delete({timeout: 5e3}));

        return true;
    }
}
