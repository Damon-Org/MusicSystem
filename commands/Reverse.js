import Modules from '@/src/Modules.js'

export default class Reverse extends Modules.music.MusicCommand {
    /**
     * @param {string} category
     * @param {Main} main
     */
    constructor(category, main) {
        super(main);

        this.register(Reverse, {
            category: category,
            guild_only: true,

            name: 'reverse',
            aliases: [],
            description: 'Reverse the queue, use d!restart to make the queue start from the beginning.',
            usage: 'reverse',
            params: [],
            example: 'reverse'
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

        this.music.queue.reverse();
        this.music.cacheSongIfNeeded();

        this.send('🔄 The queue has been reversed, you can use `restart` to start from the beginning of the queue. 🔄');
    }
}
