import Modules from '@/src/Modules.js'

export default class Resume extends Modules.music.MusicCommand {
    /**
     * @param {string} category
     * @param {Main} main
     */
    constructor(category, main) {
        super(main);

        this.register(Resume, {
            category: category,
            guild_only: true,

            name: 'resume',
            aliases: [],
            description: 'Resume music playback.',
            usage: 'resume',
            params: [],
            example: 'resume'
        });
    }

    /**
     * @param {string} trigger string representing what triggered the command
     */
    run(trigger) {
        if (this.music.isDamonInVC(this.voiceChannel)) {
            if (this.music.resumePlayback()) {
                this.send('Music playback has been resumed.');
            }

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => setTimeout(msg.delete, 5e3));

        return true;
    }
}
