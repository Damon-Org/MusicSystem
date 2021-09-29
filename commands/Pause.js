import Modules from '@/src/Modules.js'

export default class Pause extends Modules.music.MusicCommand {
    /**
     * @param {string} category
     * @param {Main} main
     */
    constructor(category, main) {
        super(main);

        this.register(Pause, {
            category: category,
            guild_only: true,

            name: 'pause',
            aliases: [],
            description: 'Pause music playback, use d!resume to resume playback.',
            usage: 'pause',
            params: [],
            example: 'pause'
        });
    }

    /**
     * @param {string} trigger string representing what triggered the command
     */
    run(trigger) {
        if (this.music.isDamonInVC(this.voiceChannel)) {
            if (this.music.pausePlayback()) {
                this.send('Music playback has been paused.');

                return true;
            }

            this.reply('music is already paused, use `resume` command to continue playing.')
                .then(msg => setTimeout(msg.delete, 5e3));

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => setTimeout(msg.delete, 5e3));

        return true;
    }
}
