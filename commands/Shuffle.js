import Modules from '@/src/Modules.js'
import { State } from '../util/Constants.js'

export default class Shuffle extends Modules.music.MusicCommand {
    /**
     * @param {string} category
     * @param {Main} main
     */
    constructor(category, main) {
        super(main);

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
     * @param {string} trigger string representing what triggered the command
     */
    run(trigger) {
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
