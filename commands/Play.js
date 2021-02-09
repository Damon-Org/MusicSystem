import MusicCommand from '../../../structures/commands/MusicCommand.js'

export default class Play extends MusicCommand {
    /**
     * @param {string} category
     * @param {Array<string>} args
     */
    constructor(category, ...args) {
        super(...args);

        this.register(Play, {
            category: category,
            guild_only: true,

            name: 'play',
            aliases: [
                'p'
            ],
            description: 'Search a song on YouTube or give a link from YouTube, SoundCloud, Spotify... to add to the queue.',
            usage: 'play <search>',
            params: [
                {
                    name: 'search',
                    description: 'Search on YouTube or use a link to add to the queue.',
                    type: 'string',
                    required: true,
                    allow_sentence: true
                }
            ],
            example: 'play https://www.youtube.com/watch?v=rVHn3GOXvzk'
        });
    }

    /**
     * @param {string} command string representing what triggered the command
     */
    async run(command) {
        if (this.args.length == 0) {
            this.reply('I can\'t search for nothing... Please give me something to search for.')
                .then(msg => msg.delete({timeout: 5e3}));

            return false;
        }

        return this.music.handle(this.args, this.msgObj, this.serverMember, this.voiceChannel);
    }
}
