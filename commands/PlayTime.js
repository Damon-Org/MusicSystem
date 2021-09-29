import Modules from '@/src/Modules.js'
import humanReadableTime from 'humanize-duration'

export default class PlayTime extends Modules.commandRegistrar.BaseCommand {
    /**
     * @param {string} category
     * @param {Main} main
     */
    constructor(category, main) {
        super(main);

        this.register(PlayTime, {
            category: category,
            guild_only: true,

            name: 'playtime',
            aliases: [
                'pt'
            ],
            description: 'Returns how long the bot has been playing audio for.',
            usage: 'playtime',
            params: [],
            example: 'playtime'
        });
    }

    /**
     * @param {string} trigger string representing what triggered the command
     */
    run(trigger) {
        if (!this.server.music.active()) {
            this.reply('No music is playing currently.')
                .then(msg => setTimeout(msg.delete, 5e3));

            return true;
        }

        this.send(`Music has been playing for ${humanReadableTime(Math.round((Date.now() - this.server.music.startTime) / 1000) * 1000)}`);

        return true;
    }
}
