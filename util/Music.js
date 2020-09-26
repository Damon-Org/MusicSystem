import Discord from 'discord.js'

import MusicChoice from './Choice.js'

import LavaTrack from './track/LavaTrack.js'
import SpotifyTrack from './track/SpotifyTrack.js'

export default class MusicUtils {
    /**
     * @param {MusicSystem} music
     */
    constructor(music) {
        this.music = music;
    }

    /**
     * @param {GuildMember} requester The person that initiated the action
     * @param {String} searchFor The string that should be looked up
     * @param {Boolean} exception
     */
    addChoice(requester, searchFor, exception) {
        const choice =
            new MusicChoice(
                this.music.getModule('api').youtube,
                searchFor,
                exception
            );

        choice.requester = requester;

        const
            server = this.music.server,
            oldChoice = server.localUsers.getProp(requester.user.id, 'choice');

        if (oldChoice && oldChoice.listener) oldChoice.listener.delete();

        server.localUsers.setProp(requester.user.id, 'choice', choice);
        return choice.genDescription();
    }

    /**
     * @param {Array<String>}
     */
    checkRequestType(args) {
        if (args.length > 1) {
            return -1;
        }

        if (args[0].includes('https://') || args[0].includes('http://')) {
            try {
                const url = new URL(args[0]);

                if (url.hostname == 'open.spotify.com') return 1;

                return 0;
            } catch (e) {
                return -1;
            }
        }
    }

    /**
     * Creates a new ChoiceEmbed embed
     * @param {Message} msgObj A Discord Message instance
     * @param {String} searchFor A string to search for in the Youtube API
     * @param {Message} noticeMsg
     * @param {Boolean} [exception=false] If the song should be added next up
     */
    async createNewChoiceEmbed(msgObj, searchFor, noticeMsg, exception = false) {
        const
            serverId = msgObj.guild.id,
            requester = msgObj.member,
            voiceChannel = requester.voice.channel,
            server = this.music.server;

        (await noticeMsg).delete();

        if (this.music.queueExists() && !this.music.isDamonInVC(voiceChannel)) {
            const newMsg = await msgObj.reply('you aren\'t in my voice channel! 😣');

            newMsg.delete({timeout: 5500});
            msgObj.delete({timeout: 1500});

            return;
        }

        if (!await this.addChoice(requester, searchFor, exception)) {
            const richEmbed = new Discord.MessageEmbed()
                .setTitle('I could not find the song you requested')
                .setDescription(`No results returned for ${searchFor}.`)
                .setColor('#ed4337');

            msgObj.channel.send(richEmbed);

            return;
        }

        const choice = server.localUsers.getProp(requester.user.id, 'choice');

        const richEmbed = new Discord.MessageEmbed()
            .setColor('#252422')
            .setDescription(choice.description)
            .setFooter('Choose a song by clicking the matching reaction below');

        const newMsg = await msgObj.channel.send(richEmbed);
        choice.listener = newMsg;
        choice.voiceChannel = voiceChannel;

        // const emojis = ['\u0030\u20E3','\u0031\u20E3','\u0032\u20E3','\u0033\u20E3','\u0034\u20E3','\u0035\u20E3', '\u0036\u20E3','\u0037\u20E3','\u0038\u20E3','\u0039\u20E3'];
        const emojis = ['\u0031\u20E3','\u0032\u20E3','\u0033\u20E3','\u0034\u20E3','\u0035\u20E3', '🚫'];
        // Custom for loop that interprets discord's trash delay
        emojis.forEach(async (emoji) => {
            if (!newMsg.deleted) {
                await newMsg.react(emoji)
                .catch(e => {
                    if (e.message != 'Unknown Message') {
                        console.log(e.stack);
                    }
                });
            }
        });
    }

    /**
     * Creates an embed asking if the user would like to add the detected playlist or not
     * @param {String} origVideoId The original videoId
     * @param {Object[]} data The fetched playlist
     * @param {Message} msgObj
     * @param {Message} noticeMsg
     * @param {Boolean} [exception=false] The serverMember that made the request
     */
    async createPlaylistFoundEmbed(origVideoId, data, msgObj, noticeMsg, exception = false) {
        const
            server = this.music.server,
            playlistObj = {
                exception: false,
                playlist: data,
                requester: msgObj.member,
                videoId: origVideoId,
                voicechannel: msgObj.member.voice.channel
            };

        const richEmbed = new Discord.MessageEmbed()
            .setAuthor('Playlist detected.')
            .setColor('#252422')
            .setDescription(`I\'ve detected that this song contains a playlist,\nare you sure you want to add **${data.length}** songs?\n\nBy confirming you agree that all songs will be added till the queue limit is hit.\nIf you decline only the original song will be added, if the playlist link does not contain a YouTube video then nothing will be added to the queue.\n\n**Keep in mind that the playlist will be added from the beginning.**`)
            .setFooter(`playlist_detected for https://youtu.be/${origVideoId}`);

        let newMsg = msgObj.reply(richEmbed);
        noticeMsg.then(msg => msg.delete());
        newMsg = await newMsg;

        playlistObj.msgObj = newMsg;
        server.localUsers.setProp(msgObj.author.id, 'playlist', playlistObj);

        const emojis = ['✅', '❎'];
        emojis.forEach(async emoji => {
            if (!newMsg.deleted) {
                await newMsg.react(emoji)
                .catch(e => {
                    if (e.message != 'Unknown Message') {
                        console.log(e.stack);
                    }
                });
            }
        });
    }

    /**
     * Helper function which handles a repetitive task
     * @param {LavaTrack|SpotifyTrack} track Track of any kind
     * @param {GuildMember} serverMember The guild member that made the request
     * @param {Message} msgObj The original message that triggered the request
     * @param {VoiceChannel} voiceChannel The voicechannel connected to the request
     * @param {Message} [noticeMsg=null] The message that says "Looking up your request"
     * @param {Boolean} [exception=false] If the song should be added next up
     * @param {Boolean} [allowSpam=true] ONLY set this param when adding a playlist
     * @returns {Boolean} Returns true upon success, false on failure => all actions should be stopped
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
     * @param {Array<String>} args
     * @param {Message} msgObj
     * @param {GuildMember} requester
     * @param {VoiceChannel} voiceChannel
     * @param {Promise<Message>} noticeMsg
     * @param {Boolean} [exception=false]
     */
    async handleRequest(args, msgObj, requester, voiceChannel, noticeMsg, exception = false) {
        let data = null;

        switch (this.checkRequestType(args)) {
            case 0: {
                data = await this.music.node.rest.resolve(args[0]);

                if (!data) {
                    const richEmbed = new Discord.MessageEmbed()
                        .setTitle('I could not find the track you requested')
                        .setDescription(`No results returned for ${args.join(' ')}.`)
                        .setColor('#ed4337');

                    msgObj.channel.send(richEmbed);

                    return true;
                }

                if (data.type === 'PLAYLIST') {
                    if (data.tracks.length > 0) {
                        const orig = (new URL(args[0])).searchParams.get('v');

                        this.createPlaylistFoundEmbed(orig, data.tracks, msgObj, noticeMsg, exception);

                        return true;
                    }

                    const richEmbed = new Discord.MessageEmbed()
                        .setTitle('Playlist Error')
                        .setDescription(`A playlist was found but did not contain any songs.`)
                        .setColor('#ed4337');

                    msgObj.channel.send(richEmbed);

                    return true;
                }

                data = new LavaTrack(data.tracks[0]);

                break;
            }
            case 1: {
                const spotify = new URL(args[0]).pathname;

                if (spotify.includes('/playlist/') || spotify.includes('/album/')) {
                    const
                        isPlaylist = spotify.includes('/playlist/'),
                        playlist =
                            isPlaylist
                            ? (await this.music.getModule('api').spotify.getPlaylist(spotify.split('/playlist/')[1])).body
                            : (await this.music.getModule('api').spotify.getAlbum(spotify.split('/album/')[1])).body;

                    noticeMsg.then(msg => msg.delete());
                    msgObj.channel.send(`I added the ${isPlaylist ? 'playlist' : 'album'} **${playlist.name}** with **${playlist.tracks.items.length}** tracks!`);

                    for (const item of playlist.tracks.items) {
                        const spotifyTrack =
                            new SpotifyTrack(
                                isPlaylist ? item.track : item,
                                this.music.mainClient,
                                !isPlaylist ? playlist.images[0].url : null
                            );

                        if (!await this.handleSongData(spotifyTrack, requester, msgObj, voiceChannel, null, false, false)) break;
                    }

                    return true;
                }
                else if (spotify.includes('/track/')) {
                    const track = (await this.music.getModule('api').spotify.getTrack(spotify.split('/track/')[1])).body;

                    data = new SpotifyTrack(track, this.music.mainClient);
                }
                else {
                    msgObj.channel.send('I have no idea what to do with that spotify link? <:thinking_hard:560389998806040586>')
                        .then(msg => msg.delete({timeout: 5e3}));

                    return true;
                }

                break;
            }
            default: {
                this.createNewChoiceEmbed(msgObj, args.join(' '), noticeMsg, exception);

                return true;
            }
        }

        return this.handleSongData(data, requester, msgObj, voiceChannel, noticeMsg, exception);
    }
}