import { MessageEmbed } from 'discord.js'

import MusicChoice from '../structures/music/Choice.js'

import DeezerTrack from '../structures/tracks/DeezerTrack.js'
import LavaTrack from '../structures/track/LavaTrack.js'
import SpotifyTrack from '../structures/track/SpotifyTrack.js'

export default class MusicUtils {
    /**
     * @param {MusicSystem} music
     */
    constructor(music) {
        this.music = music;
    }

    /**
     * @param {Array<string>}
     */
    checkRequestType(args) {
        if (args.length > 1) {
            return -1;
        }

        if (args[0].includes('https://') || args[0].includes('http://')) {
            try {
                const url = new URL(args[0]);

                if (url.hostname == 'open.spotify.com') return 1;
                if (url.hostname == 'deezer.page.link' || 'www.deezer.com' || 'deezer.com') return 2;

                return 0;
            } catch (e) {
                return -1;
            }
        }
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
            this.music.getModule('api').youtube,
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

        const reactionInterface = this.music.getModule('reactionInterface');
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
     * Creates an embed asking if the user would like to add the detected playlist or not
     * @param {string} origVideoId The original videoId
     * @param {Array<Object>} data The fetched playlist
     * @param {Message} msgObj
     * @param {Message} noticeMsg
     * @param {boolean} [exception=false]
     */
    async createPlaylistFoundEmbed(origVideoId, data, msgObj, noticeMsg, exception = false) {
        const server = this.music.server;
        const serverMember = msgObj.member;
        const voiceChannel = serverMember.voice.channel;

        const richEmbed = new MessageEmbed()
            .setAuthor('Playlist detected.')
            .setColor('#252422')
            .setDescription(`I\'ve detected that this song contains a playlist,\nare you sure you want to add **${data.length}** songs?\n\nBy confirming you agree that all songs will be added till the queue limit is hit.\nIf you decline only the original song will be added, if the playlist link does not contain a YouTube video then nothing will be added to the queue.\n\n**Keep in mind that the playlist will be added from the beginning.**`)
            .setFooter(`Playlist Detected`);

        let newMsg = msgObj.reply(richEmbed);
        noticeMsg.then(msg => msg.delete());
        newMsg = await newMsg;

        const emojis = ['✅', '❎'];

        const reactionInterface = this.music.getModule('reactionInterface');
        const reactionListener = reactionInterface.createReactionListener(newMsg, emojis, 'add', {
            playlist: data
        });

        reactionListener.on('timeout', () => {
            newMsg.delete();
        });
        reactionListener.on('reaction', async (emoji, user) => {
            if (serverMember.user.id !== user.id || !voiceChannel) return;
            reactionListener.cleanup();

            const { playlist } = reactionListener.getData();

            newMsg.delete();

            if (emoji == emojis[0]) {
                newMsg.channel.send('Successfully added playlist!');

                for (let i = 0; i < playlist.length; i++) {
                    const song = new LavaTrack(playlist[i]);
                    if (!await this.handleSongData(song, serverMember, newMsg, voiceChannel, null, false, false)) break;
                }

                return;
            }

            if (!origVideoId) {
                const richEmbed = new MessageEmbed()
                    .setTitle('Playlist Exception.')
                    .setDescription(`Playlist link did not contain a song to select.`)
                    .setColor('#ed4337');

                newMsg.channel.send(richEmbed);

                return;
            }

            const data = await this.music.node.rest.resolve(`https://youtu.be/${origVideoId}`);
            if (!data) {
                const richEmbed = new MessageEmbed()
                    .setTitle('No results returned.')
                    .setDescription(`I could not find the track you requested or access to this track is limited.\nPlease try again with something other than what you tried to search for.`)
                    .setColor('#ed4337');

                newMsg.channel.send(richEmbed);

                return;
            }

            data = new LavaTrack(data);
            this.handleSongData(data, serverMember, newMsg, voiceChannel, null, exception);
        });
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
        let data = null;

        switch (this.checkRequestType(args)) {
            case 0: {
                data = await this.music.node.rest.resolve(args[0]);

                if (!data) {
                    const richEmbed = new MessageEmbed()
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

                    const richEmbed = new MessageEmbed()
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
                            ? (await this.music._m.getModule('api').spotify.getPlaylist(spotify.split('/playlist/')[1])).body
                            : (await this.music._m.getModule('api').spotify.getAlbum(spotify.split('/album/')[1])).body;

                    noticeMsg.then(msg => msg.delete());
                    msgObj.channel.send(`I added the ${isPlaylist ? 'playlist' : 'album'} **${playlist.name}** with **${playlist.tracks.items.length}** tracks!`);

                    for (const item of playlist.tracks.items) {
                        const spotifyTrack =
                            new SpotifyTrack(
                                isPlaylist ? item.track : item,
                                this.music._m,
                                !isPlaylist ? playlist.images[0].url : null
                            );

                        if (!await this.handleSongData(spotifyTrack, requester, msgObj, voiceChannel, null, false, false)) break;
                    }

                    return true;
                }
                else if (spotify.includes('/track/')) {
                    const track = (await this.music._m.getModule('api').spotify.getTrack(spotify.split('/track/')[1])).body;

                    data = new SpotifyTrack(track, this.music._m);
                }
                else {
                    msgObj.channel.send('I have no idea what to do with that spotify link? <:thinking_hard:560389998806040586>')
                        .then(msg => msg.delete({timeout: 5e3}));

                    return true;
                }

                break;
            }
            case 2: {
                let deezer = new URL(args[0]).pathname;
                let isPlaylistOrAlbum = deezer.includes('/playlist') || deezer.includes('/album');

                // the link is a shortened version without identifiers for track, album or playlist
                if (!deezer.includes('/playlist') && !deezer.includes('/album/') && !deezer.includes('/track/')) {
                    const trackLink = await this.music._m.getModule('api').deezer.fetchSharableLink(deezer);

                    deezer = new URL(trackLink).pathname;

                    // if its a regular track we just add it and call it a day
                    if(!deezer.includes('/playlist/') && !deezer.includes('/album/')) {
                        const track = (await this.music._m.getModule('api').deezer.getTrack(deezer.split('/track/')[1]));

                        data = new DeezerTrack(track, this.music._m);

                        break;
                    }

                    // link was not a track, but a playlist or an album
                    isPlaylistOrAlbum = true;
                }

                if (isPlaylistOrAlbum) {
                    const
                        isPlaylist = deezer.includes('/playlist/'),
                        playlist =
                            isPlaylist
                            ? (await this.music._m.getModule('api').deezer.getPlaylist(deezer.split('/playlist/')[1]))
                            : (await this.music._m.getModule('api').deezer.getAlbum(deezer.split('/album/')[1]));

                    noticeMsg.then(msg => msg.delete());
                    msgObj.channel.send(`I added the ${isPlaylist ? 'playlist' : 'album'} **${playlist.title}** from Deezer, with **${playlist.tracks.data.length}** tracks!`);

                    for (const item of playlist.tracks.data) {
                        const deezerTrack =
                            new DeezerTrack(
                                item,
                                this.music._m
                            );

                        if (!await this.handleSongData(deezerTrack, requester, msgObj, voiceChannel, null, false, false)) break;
                    }

                    return true;
                }
                else if (deezer.includes('/track/')) {
                    const track = (await this.music._m.getModule('api').deezer.getTrack(deezer.split('/track/')[1]));
                    data = new DeezerTrack(track, this.music._m);
                } else {
                    msgObj.channel.send('I have no idea what to do with that deezer link? <:thinking_hard:560389998806040586>')
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
