import MusicCommand from '../../../structures/commands/MusicCommand.js'

export default class Previous extends MusicCommand {
    /**
     * @param {String} category
     * @param {Array<*>} args
     */
    constructor(category, ...args) {
        super(...args);

        this.register(Previous, {
            category: category,
            guild_only: true,

            name: 'previous',
            aliases: [
                'back'
            ],
            description: 'Play the previous song in queue.',
            usage: 'previous',
            params: [],
            example: 'previous'
        });
    }

    /**
     * @param {String} command string representing what triggered the command
     */
    async run(command) {
        if (this.music.isDamonInVC(this.voiceChannel)) {
            this.music.playPreviousTrack();

            this.msgObj.react('⏮️');

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => setTimeout(msg.delete, 5e3));
    }
}
