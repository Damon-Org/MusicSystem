import MusicCommand from '../../../structures/commands/MusicCommand.js'
import { State } from '../util/Constants.js'

export default class Shuffle extends MusicCommand {
    /**
     * @param {String} category
     * @param {Array<*>} args
     */
    constructor(category, ...args) {
        super(...args);

        this.register(Shuffle, {
            category: category,
            guild_only: true,

            name: 'shuffle',
            aliases: [],
            description: 'Shuffle all the songs currently in the queue.',
            usage: 'shuffle',
            params: [],
            example: 'shuffle'
        });
    }

    /**
     * @param {String} command string representing what triggered the command
     */
    async run(command) {
        if (!this.music.isDamonInVC(this.voiceChannel)) {
            this.reply('you aren\'t in my voice channel! 😣')
                .then(msg => setTimeout(msg.delete, 5e3));

            return true;
        }

        if (this.music.state !== State.PLAYING) {
            this.reply('bot is processing or changing tracks, please try again later...')
                .then(msg => setTimeout(msg.delete, 5e3));

            return true;
        }

        this.music.queue.shuffle();
        this.music.cacheSongIfNeeded();

        this.send('🔀 The queue has been shuffled. 🔀');

        return true;
    }
}
