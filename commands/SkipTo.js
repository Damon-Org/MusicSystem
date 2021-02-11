import MusicCommand from '../../../structures/commands/MusicCommand.js'

export default class SkipTo extends MusicCommand {
    /**
     * @param {String} category
     * @param {Array<*>} args
     */
    constructor(category, ...args) {
        super(...args);

        this.register(SkipTo, {
            category: category,
            guild_only: true,

            name: 'skip to',
            aliases: [
                'skipto'
            ],
            description: 'Skip to a specific song nummer in queue.',
            usage: 'skip to <#queue-number>',
            params: [
                {
                    name: 'queue-number',
                    description: 'Number of a song in queue',
                    type: 'int',
                    required: true
                }
            ],
            example: 'skipto 5'
        });
    }

    /**
     * @param {String} command string representing what triggered the command
     */
    async run(command) {
        if (this.music.isDamonInVC(this.voiceChannel)) {
            if (await this.music.skipTo(this.args[0])) {
                if (this.args[0] == 1) {
                    this.reply('skipping to the currently playing song does nothing.')
                        .then(msg => msg.delete({timeout: 5e3}));

                    return true;
                }

                this.msgObj.react('👍');

                return true;
            }

            this.reply(`invalid song number. \nThe number of the song has to exist in queue, check queue with ${this.server.prefix}q <# page number>.`)
                .then(msg => msg.delete({timeout: 5e3}));

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => msg.delete({timeout: 5e3}));

        return true;
    }
}
