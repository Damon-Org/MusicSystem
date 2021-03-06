import MusicCommand from '../../../structures/commands/MusicCommand.js'

export default class Remove extends MusicCommand {
    /**
     * @param {String} category
     * @param {Array<*>} args
     */
    constructor(category, ...args) {
        super(...args);

        this.register(Remove, {
            category: category,
            guild_only: true,

            name: 'remove',
            aliases: [
                'rm',
                'remove song',
                'removesong'
            ],
            description: 'Remove a song by giving the number of the song in queue.',
            usage: 'remove [query]',
            params: [
                {
                    name: 'query',
                    description: 'Title of the song or the queue number',
                    type: 'string',
                    default: 'Will remove the currently playing song from queue',
                    is_sentence: true
                }
            ],
            example: 'remove 3'
        });
    }

    /**
     * @param {String} command string representing what triggered the command
     */
    async run(command) {
        if (this.music.isDamonInVC(this.voiceChannel)) {
            const [track] = this.music.removeSong(this.args[0]);

            if (track) {
                this.reply(`removed **${track.title}** from the queue.`);

                return true;
            }

            this.reply('invalid track title or invalid queue number.')
                .then(msg => msg.delete({timeout: 5e3}));

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => msg.delete({timeout: 5e3}));

        return true;
    }
}
