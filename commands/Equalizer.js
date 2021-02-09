import MusicCommand from '../../../structures/commands/MusicCommand.js'

export default class Equalizer extends MusicCommand {
    /**
     * @param {string} category
     * @param {Array<*>} args
     */
    constructor(category, ...args) {
        super(...args);

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
                    required: true
                }
            ],
            example: 'eq deep'
        });

        const { EqualizerBands } = this._m.modules.music.constants;
        this.eqBands = EqualizerBands;
    }

    /**
     * @param {string} command string representing what triggered the command
     */
    async run(command) {
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
            .then(msg => msg.delete({timeout: 5e3}));

        return true;
    }
}
