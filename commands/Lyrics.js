import { MessageEmbed } from 'discord.js'

import Modules from '@/src/Modules.js'

export default class Lyrics extends Modules.music.MusicCommand {
    /**
     * @param {string} category
     * @param {Main} main
     */
    constructor(category, main) {
        super(main);

        this.register(Lyrics, {
            disabled: true,

            category: category,
            guild_only: true,

            name: 'lyrics',
            aliases: [
                'l'
            ],
            description: 'Finds the lyrics of the current song, or searches lyrics for a given song.',
            usage: 'lyrics <query (optional)>',
            params: [
                {
                    name: 'query',
                    description: 'E.g. The name of the artist and the song.',
                    type: 'string',
                    required: false,
                    is_sentence: true
                }
            ],
            example: 'lyrics Alvaro Soler La Cintura'
        });
    }

    /**
     * @param {string} trigger string representing what triggered the command
     */
    async run(trigger) {
        const active = this.music.queue.active();

        let title = null;
        let lyric = null;

        if (this.args.length == 0) {
            if (active === null) {
                this.reply('There is no active song playing at the moment. Please enter a search query instead.')
                    .then(msg => setTimeout(msg.delete, 5e3));

                return false;
            }

            title = active.title;
        }

        if (title)
            lyric = await this.modules.lyrics.fetch(title);
        else
            lyric = await this.modules.lyrics.fetch(this.args[0].join(' '));

        if (!lyric) {
            this.reply('Could not find any lyrics for that song.')
                .then(msg => setTimeout(msg.delete, 5e3));

            return false;
        }

        // TODO: Prevent it from cutting words in half
        for (let i = 0; i < lyric.length; i++) {
            const richEmbed = new MessageEmbed()
                .setDescription(lyric[i])
                .setColor('#ff6038');

            if (i === 0)
                richEmbed.setTitle(`Lyrics for ${title ? title : this.args.join(' ')}`);

            this.reply(richEmbed);
        }

        return true;
    }
}
