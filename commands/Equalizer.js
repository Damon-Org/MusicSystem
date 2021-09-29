import Modules from '@/src/Modules.js'

export default class Equalizer extends Modules.music.MusicCommand {
    /**
     * @param {string} category
     * @param {Main} main
     */
    constructor(category, main) {
        super(main);

        this.register(Equalizer, {
            category: category,
            guild_only: true,

            name: 'equalizer',
            aliases: [
                'eq',
            ],
            description: 'Change the equalizer of the music player, do d!equalizer to get the equalizer presets that are available.',
            usage: 'eq <preset>',
            params: [
                {
                    name: 'preset',
                    description: 'A preset name.',
                    type: 'string',
                    default: null
                }
            ],
            example: 'eq deep'
        });

        const { EqualizerBands } = Modules.music.constants;
        this.eqBands = EqualizerBands;
    }

    /**
     * @param {string} trigger string representing what triggered the command
     */
    run(trigger) {
        if (this.music.isDamonInVC(this.voiceChannel) && this.music.active()) {
            const preset = this.eqBands[this.args[0]];

            if (!preset) {
                const embed = new this.Discord.MessageEmbed()
                    .setTitle('Invalid Equalizer Preset')
                    .setDescription('Choose one of the following:\n```- bass\n- xbass\n- deep\n- flat/normal\n- r&b\n- rock\n- treble\n- vocal```');

                this.reply(embed);

                return true;
            }

            this.music.player.setEqualizer(preset);

            this.send(`The player equalizer has been changed to \`${this.args[0]}\``);

            return true;
        }

        this.reply('you aren\'t in my voice channel! 😣')
            .then(msg => setTimeout(msg.delete, 5e3));

        return true;
    }
}
