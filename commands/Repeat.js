import MusicCommand from '../../../structures/commands/MusicCommand.js'

export default class Repeat extends MusicCommand {
    /**
     * @param {String} category
     * @param {Array<*>} args
     */
    constructor(category, ...args) {
        super(...args);

        this.register(Repeat, {
            category: category,
            guild_only: true,

            name: 'repeat',
            aliases: ['loop'],
            description: 'Repeat the active song.',
            usage: 'repeat',
            params: [],
            example: 'repeat'
        });
    }

    /**
     * @param {String} command string representing what triggered the command
     */
    async run(command) {
        if (this.music.isDamonInVC(this.voiceChannel)) {
            if (this.music.queue.active() == null) {
                this.reply('the currently playing song has been removed, thus it cannot be put in repeat.')
                    .then(msg => setTimeout(msg.delete, 5e3));

                return true;
            }

            if (this.music.repeatToggle()) {
                this.send('Repeat has been **enabled**.');

                return true;
            }

            this.send('Repeat has been **disabled**.');

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => setTimeout(msg.delete, 5e3));

        return true;
    }
}
