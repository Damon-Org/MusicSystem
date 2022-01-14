import Modules from '@/src/Modules.js'

export default class VolumeDefault extends Modules.commandRegistrar.BaseCommand {
    /**
     * @param {string} category
     * @param {Main} main
     */
    constructor(category, main) {
        super(main);

        this.register(VolumeDefault, {
            disabled: true,

            category: category,
            guild_only: true,

            name: 'volume default',
            aliases: [],
            description: 'Set the default volume level for the bot every time it joins.',
            usage: 'volume default [volume]',
            params: [
                {
                    name: 'volume',
                    description: 'New default volume level.',
                    type: 'int',
                    default: 'Set the volume back to its default volume.'
                }
            ],
            example: 'volume default 50'
        });
    }

    /**
     * @param {string} trigger string representing what triggered the command
     */
    async run(trigger) {
        const volume = this.get('volume');
        if (volume && volume > 5 && volume < 200) {
            await this.server.settings.update({ music_system: { volume } });

            this.send(`The default volume has been set to ${volume}, use \`d!volume default\` to set the old volume level back.`);

            return true;
        }

        await this.server.settings.update({ music_system: { volume: Modules.music.constants.SystemReset.volume } });

        this.send('No default volume given, the default volume has been set to 30.');

        return true;
    }
}
