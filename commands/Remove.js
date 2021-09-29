import Modules from '@/src/Modules.js'

export default class Remove extends Modules.music.MusicCommand {
    /**
     * @param {string} category
     * @param {Main} main
     */
    constructor(category, main) {
        super(main);

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
     * @param {string} trigger string representing what triggered the command
     */
    run(trigger) {
        if (this.music.isDamonInVC(this.voiceChannel)) {
            const track = this.music.removeSong(this.args[0]);

            if (track) {
                this.reply(`removed **${track.title}** from the queue.`);

                return true;
            }

            this.reply('invalid track title or invalid queue number.')
                .then(msg => setTimeout(msg.delete, 5e3));

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => setTimeout(msg.delete, 5e3));

        return true;
    }
}
