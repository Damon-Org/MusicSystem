import { MessageEmbed } from 'discord.js'

import MusicChoice from '../structures/music/Choice.js'

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
     * @param {boolean} [exception=false] If the song should be added next up
     */
    async createNewChoiceEmbed(msgObj, searchFor, noticeMsg, exception = false) {
        const serverMember = msgObj.member;
        const voiceChannel = serverMember.voice.channel;

        noticeMsg.then(msg => msg.delete());

        if (this.music.queueExists() && !this.music.isDamonInVC(voiceChannel)) {
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

            this.handleSongData(data, serverMember, newMsg, voiceChannel, null, exception);
        });

        // const emojis = ['\u0030\u20E3','\u0031\u20E3','\u0032\u20E3','\u0033\u20E3','\u0034\u20E3','\u0035\u20E3', '\u0036\u20E3','\u0037\u20E3','\u0038\u20E3','\u0039\u20E3'];
    }

    /**
     * Helper function which handles a repetitive task
     * @param {LavaTrack|SpotifyTrack} track Track of any kind
     * @param {GuildMember} serverMember The guild member that made the request
     * @param {Message} msgObj The original message that triggered the request
     * @param {VoiceChannel} voiceChannel The voicechannel connected to the request
     * @param {Message} [noticeMsg=null] The message that says "Looking up your request"
     * @param {boolean} [exception=false] If the song should be added next up
     * @param {boolean} [allowSpam=true] ONLY set this param when adding a playlist
     * @returns {boolean} Returns true upon success, false on failure => all actions should be stopped
     */
    async handleSongData(track, serverMember, msgObj, voiceChannel, noticeMsg = null, exception = false, allowSpam = true) {
        const musicSystem = this.music;
        if (noticeMsg) noticeMsg.then(msg => msg.delete());

        if (musicSystem.shutdown.type() == 'leave') musicSystem.reset(false);

        if (musicSystem.queueExists()) {
            if (musicSystem.isDamonInVC(voiceChannel) || !allowSpam) {
                if (!musicSystem.addToQueue(track, serverMember, exception)) {
                    msgObj.channel.send(`The queue is full, this server is limited to ${musicSystem.queue.maxLength} tracks.`)
                        .then(msg => msg.delete({timeout: 5e3}));

                    return false;
                }

                if (allowSpam) msgObj.channel.send(exception ? `Added song *next up* **${track.title}**` : `Added song **${track.title}**`);

                return true;
            }
            msgObj.reply('you aren\'t in my voice channel! 😣')
                .then(msg => msg.delete({timeout: 5e3}));

            return false;
        }
        await musicSystem.createQueue(track, serverMember, msgObj.channel);

        if (await musicSystem.startQueue(voiceChannel) && allowSpam) {
            msgObj.channel.send(`Playback starting with **${track.title}**`);
        }
        return true;
    }

    /**
     * @param {Array<string>} args
     * @param {Message} msgObj
     * @param {GuildMember} requester
     * @param {VoiceChannel} voiceChannel
     * @param {Promise<Message>} noticeMsg
     * @param {boolean} [exception=false]
     */
    async handleRequest(args, msgObj, requester, voiceChannel, noticeMsg, exception = false) {
        const trackResolver = this.music.modules.trackResolver;

        if (!trackResolver.isValidResolvable(args)) {
            this.createNewChoiceEmbed(msgObj, args.join(' '), noticeMsg, exception);

            return true;
        }

        const data = await trackResolver.resolve(args[0]);

        if (!data) {
            noticeMsg.then(msg => msg.delete());

            const richEmbed = new MessageEmbed()
                .setTitle('I could not find the track you requested')
                .setDescription(`No results returned for ${args.join(' ')}.`)
                .setColor('#ed4337');

            msgObj.channel.send(richEmbed);

            return true;
        }

        if (data instanceof Array) {
            noticeMsg.then(msg => msg.delete());
            msgObj.channel.send('Successfully added playlist!');

            for (const item of data) {
                if (!await this.handleSongData(item, requester, msgObj, voiceChannel, null, false, false)) break;
            }

            return true;
        }

        return this.handleSongData(data, requester, msgObj, voiceChannel, noticeMsg, exception);
    }
}
