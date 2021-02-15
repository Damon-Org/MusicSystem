import MusicCommand from '../../../structures/commands/MusicCommand.js'

export default class PlayNext extends MusicCommand {
    /**
     * @param {String} category
     * @param {Array<String>} args
     */
    constructor(category, ...args) {
        super(...args);

        this.register(PlayNext, {
            category: category,
            guild_only: true,

            name: 'play next',
            aliases: [
                'pn',
                'playnext'
            ],
            description: 'Adds song directly after currently playing song, if no music is playing a queue will be created and the song will be played instead.',
            usage: 'play next <search>',
            params: [
                {
                    name: 'search',
                    description: 'Search on YouTube or use a YouTube link.',
                    type: 'string',
                    required: true,
                    is_sentence: true
                }
            ],
            example: 'play https://www.youtube.com/watch?v=rVHn3GOXvzk'
        });
    }

    /**
     * @param {String} command string representing what triggered the command
     */
    async run(command) {
        if (this.args.length == 0) {
            this.reply('I can\'t search for nothing... Please give me something to search for.')
                .then(msg => msg.delete({timeout: 5e3}));

            return false;
        }

        return this.music.handle(this.args, this.msgObj, this.serverMember, this.voiceChannel, true);
    }
}
