import { MessageEmbed } from 'discord.js'
import MusicChoice from '../structures/music/Choice.js'
import LavaTrack from '../structures/track/LavaTrack.js'

export default class MusicUtils {
    /**
     * @param {MusicSystem} music
     */
    constructor(music) {
        this.music = music;
    }

    /**
     * Creates a new ChoiceEmbed embed
     * @param {Message} msgObj A Discord Message instance
     * @param {string} searchFor A string to search for in the Youtube API
     * @param {Message} noticeMsg
     * @param {boolean} [exception = false] If the song should be added next up
     */
    async createNewChoiceEmbed(msgObj, searchFor, noticeMsg, exception = false) {
        const serverMember = msgObj.member;
        const voiceChannel = serverMember.voice.channel;

        noticeMsg.then(msg => msg.delete());

        if (this.music.active() && !this.music.isDamonInVC(voiceChannel)) {
            const newMsg = await msgObj.reply('you aren\'t in my voice channel! 😣');

            newMsg.delete({timeout: 5500});
            msgObj.delete({timeout: 1500});

            return;
        }

        const choice = new MusicChoice(
            this.music.modules.api.youtube,
            searchFor
        );
        if (!await choice.genDescription()) {
            const richEmbed = new MessageEmbed()
                .setTitle('I could not find the song you requested')
                .setDescription(`No results returned for ${searchFor}.`)
                .setColor('#ed4337');

            msgObj.channel.send(richEmbed);

            return;
        }

        const richEmbed = new MessageEmbed()
            .setColor('#252422')
            .setDescription(choice.description)
            .setFooter('Choose a song by clicking the matching reaction below');

        const newMsg = await msgObj.channel.send(richEmbed);

        const emojis = ['\u0031\u20E3','\u0032\u20E3','\u0033\u20E3','\u0034\u20E3','\u0035\u20E3', '🚫'];

        const reactionInterface = this.music.modules.reactionInterface;
        const reactionListener = reactionInterface.createReactionListener(newMsg, emojis, 'add');

        reactionListener.on('timeout', () => {
            // Cleanup is already called at this point
            newMsg.edit('Choice Request timed out.');
        });
        reactionListener.on('reaction', async (emoji, user) => {
            if (serverMember.user.id !== user.id || !voiceChannel) return;
            reactionListener.cleanup();

            newMsg.delete();

            const index = emojis.indexOf(emoji);

            if (index > 4) return;

            const videoId = choice.ids[index];
            if (!videoId) return;

            let data = null;
            let attempt = 0;
            do {
                data = await this.music.node.rest.resolve(`https://youtu.be/${videoId}`);

                attempt++;
            } while ((!data || data.tracks.length == 0) && attempt < 3);

            if (!data || data.length == 0) {
                newMsg.channel.send(`${requester}, failed to queue song, perhaps the song is limited in country or age restricted?`)
                    .then(msg => msg.delete({timeout: 5e3}));

                return;
            }

            data = new LavaTrack(data.tracks[0]);

            if (!voiceChannel.members.has(user.id)) {
                newMsg.channel.send(`${requester}, you've left your original voicechannel, request ignored.`)
                    .then(msg => msg.delete({timeout: 5e3}));

                return;
            }

            this.music.handleData(data, serverMember, newMsg, voiceChannel, null, exception);
        });

        // const emojis = ['\u0030\u20E3','\u0031\u20E3','\u0032\u20E3','\u0033\u20E3','\u0034\u20E3','\u0035\u20E3', '\u0036\u20E3','\u0037\u20E3','\u0038\u20E3','\u0039\u20E3'];
    }
}
