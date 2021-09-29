import Modules from '@/src/Modules.js'

export default class Queue extends Modules.commandRegistrar.BaseCommand {
    /**
     * @param {string} category
     * @param {Main} main
     */
    constructor(category, main) {
        super(main);

        this.register(Queue, {
            category: category,
            guild_only: true,

            name: 'queue',
            aliases: [
                'q'
            ],
            description: 'Show all the queue\'d songs',
            usage: 'queue [page-number]',
            params: [
                {
                    name: 'page-number',
                    description: 'Queue page number',
                    type: 'int',
                    default: 'Shows the first page of queue'
                }
            ],
            example: 'queue 2'
        });
    }

    get music() {
        return this.server.music;
    }

    /**
     * @param {string} trigger string representing what triggered the command
     */
    async run(trigger) {
        const server = this.msgObj.guild;
        const maxPrequeue = this.music.queue.maxPrequeue;

        if (!this.music.active()) {
            this.reply('No music is playing currently.')
                .then(msg => setTimeout(msg.delete, 5e3));

            return;
        }

        const pageSize = 10;
        const number = this.args[0] ? this.args[0] : null;
        let page = 0;
        let bottomLimit = 0;
        let topLimit = 0;

        if (!number || number.length == 0) {
            bottomLimit = maxPrequeue + (pageSize * page) - (pageSize / 2);
            topLimit = maxPrequeue + (pageSize * page) + (pageSize / 2);
        }
        else {
            page = parseInt(number);

            if (page > 0) {
                page--;
            }

            if (page == 0 || page == 1) {
                bottomLimit = maxPrequeue + (pageSize * page) - (pageSize / 2),
                topLimit = maxPrequeue + (pageSize * page) + (pageSize / 2);
            }
            else {
                bottomLimit = maxPrequeue + (pageSize * page) - (pageSize / 2);
                topLimit = maxPrequeue + (pageSize * page) + (pageSize / 2);

                if (bottomLimit < 0) bottomLimit = 0;
            }
        }

        if (this.music.active()) {
            const length = this.music.queue.length;
            let embedDescription = '';

            const prefix = await this.modules.serverSettings.getPrefix(this.server);

            for (let i = bottomLimit; i < topLimit; i++) {
                if (i == maxPrequeue) {
                    if (this.music.queue[maxPrequeue] == null && (this.music.queue[maxPrequeue - 1] == null && this.music.queue[maxPrequeue + 1] == null)) {
                        continue;
                    }
                }
                else if (this.music.queue[i] == null) {
                    continue;
                }

                const track = this.music.queue[i];
                if (!track) continue;

                if (i < maxPrequeue) {
                    if (embedDescription.length == 0) {
                        embedDescription = `\`\`\`asciidoc\n[PREVIOUSLY${(page != 0) ? ' – Page ' + Math.abs(page - 1) : ''}]\`\`\`\n`;
                    }

                    embedDescription += `\`\`\`asciidoc\n[${(i - maxPrequeue)}] :: ${track.title}\`\`\``;
                }

                if (i == maxPrequeue) {
                    if (track == null) {
                        embedDescription += `\n\n\`\`\`md\n< NOW PLAYING >\n{ SONG HAS BEEN REMOVED }\`\`\``;
                    }
                    else {
                        embedDescription += `\n\n\`\`\`md\n< NOW PLAYING >\n${track.title}\`\`\``;
                    }
                }

                if (i == (maxPrequeue + 1) || embedDescription.length == 0) {
                    embedDescription += `\n\n\`\`\`ini\n[NEXT UP${(page != 0) ? ' – Page ' + (page + 1) : ''}]\`\`\`\n`;
                }

                if (i > maxPrequeue && track) {
                    embedDescription += `\`\`\`ini\n[${i - maxPrequeue + 1}] ${track.title}\`\`\``;
                }

                if (i == (topLimit - 1) || i == (length - 2)) {
                    const embed = new this.Discord.MessageEmbed()
                        .setAuthor('Queue for ' + server.name, server.iconURL)
                        .setColor('#252422')
                        .setDescription(embedDescription)
                        .setFooter(`You can use ${prefix}q #number to see other pages of the queue.`);

                    this.sendEmbed(embed);

                    return true;
                }
            }

            const embed = new this.Discord.MessageEmbed()
                .setAuthor('Queue for ' + server.name, server.iconURL)
                .setColor('#252422')
                .setDescription('This page is empty.')
                .setFooter(`You can use ${prefix}q #number to see other pages of the queue.`);

            this.sendEmbed(embed);

            return true;
        }

        this.reply('no music is playing currently.')
            .then(msg => setTimeout(msg.delete, 5e3));

        return true;
    }
}
