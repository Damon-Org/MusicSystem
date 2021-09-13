import MusicCommand from '../../../structures/commands/MusicCommand.js'

export default class Volume extends MusicCommand {
    /**
     * @param {string} category
     * @param {Main} main
     */
    constructor(category, main) {
        super(main);

        this.register(Volume, {
            category: category,
            guild_only: true,

            name: 'volume',
            aliases: [
                "vol",
                "v"
            ],
            description: 'Change the volume of the music player.',
            usage: 'volume [volume]',
            params: [
                {
                    name: 'volume',
                    description: 'A number ranging from 1 to 200',
                    type: 'int',
                    default: 'Will show the current volume.'
                }
            ],
            example: 'volume 50'
        });
    }

    /**
     * @param {string} command string representing what triggered the command
     */
    async run(command) {
        if (this.music.isDamonInVC(this.voiceChannel)) {
            const volume = this.args[0];

            if (!volume) {
                this.reply('please give a value, command format: `volume #number`.')
                    .then(msg => setTimeout(msg.delete, 5e3));

                return true;
            }

            /*if (isNaN(volume) || volume.includes(',')) {
                this.reply('invalid volume level, make sure you give a number and that there\'s no `,` in that number.')
                    .then(msg => setTimeout(msg.delete, 5e3));

                return true;
            }*/

            if (volume < 5 || volume > 200) {
                this.reply('invalid volume level, please give a value between 5 and 200')
                    .then(msg => setTimeout(msg.delete, 5e3));

                return true;
            }

            if (this.music.setVolume(volume)) {
                this.send(`Volume level has been changed to \`${volume}\`.`);

                return true;
            }

            this.reply('volume level unchanged.');

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => setTimeout(msg.delete, 5e3));

        return true;
    }
}
