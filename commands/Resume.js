import MusicCommand from '../../../structures/commands/MusicCommand.js'

export default class Resume extends MusicCommand {
    /**
     * @param {String} category
     * @param {Array<*>} args
     */
    constructor(category, ...args) {
        super(...args);

        this.register(Resume, {
            category: category,
            guild_only: true,

            name: 'resume',
            aliases: [],
            description: 'Resume music playback.',
            usage: 'resume',
            params: [],
            example: 'resume'
        });
    }

    /**
     * @param {String} command string representing what triggered the command
     */
    async run(command) {
        if (this.music.isDamonInVC(this.voiceChannel)) {
            if (this.music.resumePlayback()) {
                this.send('Music playback has been resumed.');
            }

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => msg.delete({timeout: 5e3}));

        return true;
    }
}
