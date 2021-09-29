import Modules from '@/src/Modules.js'

export default class Restart extends Modules.music.MusicCommand {
    /**
     * @param {string} category
     * @param {Main} main
     */
    constructor(category, main) {
        super(main);

        this.register(Restart, {
            category: category,
            guild_only: true,

            name: 'restart',
            aliases: [],
            description: 'Stop music playback and start playing from the start of the queue.',
            usage: 'restart',
            params: [],
            example: 'restart'
        });
    }

    /**
     * @param {string} trigger string representing what triggered the command
     */
    async run(trigger) {
        if (this.music.isDamonInVC(this.voiceChannel) && this.music.active()) {
            this.send('The queue has been reset to the start.');

            this.music.queue.rewind();
            this.music.setState('SWITCHING');

            this.music.repeat = false;

            if (this.music.shutdown.type == 'leave') {
                this.music.shutdown.cancel();
                this.music.playNextTrack();

                return true;
            }
            if (!await this.music.player.stopTrack()) this.music.soundEnd();

            return true;
        }

        this.reply('you aren\'t in my voice channel or I\'m not done playing music! 😣')
            .then(msg => setTimeout(msg.delete, 5e3));

        return true;
    }
}
