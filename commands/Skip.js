import Modules from '@/src/Modules.js'

export default class Skip extends Modules.music.MusicCommand {
    /**
     * @param {string} category
     * @param {Main} main
     */
    constructor(category, main) {
        super(main);

        this.register(Skip, {
            category: category,
            guild_only: true,

            name: 'skip',
            aliases: [
                'next',
                's'
            ],
            description: 'Skip the active song and start playing the next in queue.',
            usage: 'skip',
            params: [],
            example: 'skip'
        });
    }

    /**
     * @param {string} trigger string representing what triggered the command
     */
    async run(trigger) {
        if (this.music.isDamonInVC(this.voiceChannel)) {
            this.msgObj.react('⏭');

            if (!await this.music.player.stopTrack()) this.music.soundEnd();

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => setTimeout(msg.delete, 5e3));

        return true;
    }
}
