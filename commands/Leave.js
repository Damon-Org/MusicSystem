import MusicCommand from '../../../structures/commands/MusicCommand.js'

export default class Leave extends MusicCommand {
    /**
     * @param {String} category
     * @param {Array<*>} args
     */
    constructor(category, ...args) {
        super(...args);

        this.register(Leave, {
            category: category,
            guild_only: true,

            name: 'leave',
            aliases: [
                'quit',
                'exit',
                'stop'
            ],
            description: 'Make the bot leave the voice channel.',
            usage: 'leave',
            params: [],
            example: 'leave'
        });
    }

    /**
     * @param {String} command string representing what triggered the command
     */
    async run(command) {
        if (!this.voiceChannel && !this.music.shutdown.type) {
            this.reply('where are you? I can\'t seem to find you in any voice channel. <:thinking_hard:560389998806040586>')
                .then(msg => setTimeout(msg.delete, 5e3));

            return true;
        }

        if (this.music.isDamonInVC(this.voiceChannel) || this.music.shutdown.type) {
            this.msgObj.react('👋');

            this.music.shutdown.instant();

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => setTimeout(msg.delete, 5e3));

        return true;
    }
}
