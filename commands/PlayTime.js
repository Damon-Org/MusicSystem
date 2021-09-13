import BaseCommand from '../../../structures/commands/BaseCommand.js'
import humanReadableTime from 'humanize-duration'

export default class PlayTime extends BaseCommand {
    /**
     * @param {String} category
     * @param {Array<*>} args
     */
    constructor(category, ...args) {
        super(...args);

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
     * @param {String} command string representing what triggered the command
     */
    async run(command) {
        if (!this.server.music.active()) {
            this.reply('No music is playing currently.')
                .then(msg => setTimeout(msg.delete, 5e3));

            return true;
        }

        this.send(`Music has been playing for ${humanReadableTime(Math.round((Date.now() - this.server.music.startTime) / 1000) * 1000)}`);

        return true;
    }
}
