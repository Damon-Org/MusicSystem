import Modules from '@/src/Modules.js'

export default class Previous extends Modules.music.MusicCommand {
    /**
     * @param {string} category
     * @param {Main} main
     */
    constructor(category, main) {
        super(main);

        this.register(Previous, {
            category: category,
            guild_only: true,

            name: 'previous',
            aliases: [
                'back'
            ],
            description: 'Play the previous song in queue.',
            usage: 'previous',
            params: [],
            example: 'previous'
        });
    }

    /**
     * @param {string} trigger string representing what triggered the command
     */
    run(trigger) {
        if (this.music.isDamonInVC(this.voiceChannel)) {
            this.music.playPreviousTrack();

            this.msgObj.react('⏮️');

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => setTimeout(msg.delete, 5e3));
    }
}
