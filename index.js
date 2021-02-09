import { OnMusicPlayerAction } from './structures/music/Action.js'
import Constants, { PlayTrackOptions, State, SystemReset } from './util/Constants.js'
import Discord, { MessageEmbed } from 'discord.js'
import MusicUtils from './util/Music.js'
import Queue from './structures/music/Queue.js'
import ServerModule from './structures/modules/ServerModule.js'
import ShutdownManager from './util/ShutdownManager.js'

export default class Music extends ServerModule {
    queue = new Queue();
    shutdown = new ShutdownManager(this);
    utils = new MusicUtils(this);

    /**
     * @param {Main} main
     * @param {Server} server
     */
    constructor(main, server) {
        super(main, server);

        this.register(Music, {
            name: 'music',
            scope: {
                group: 'server',
                name: 'music'
            },
            requires: [
                'api',
                'eventExtender',
                'lavalink'
            ],
            events: [
                {
                    name: 'voiceJoin',
                    call: '_voiceJoin'
                },
                {
                    name: 'voiceLeave',
                    call: '_voiceLeave'
                }
            ]
        });

        Object.defineProperty(this, 'onMusicPlayerAction', { value: OnMusicPlayerAction.bind(this) });
    }

    get constants() {
        return Constants;
    }

    get lava() {
        return this.modules.lavalink.conn;
    }

    get node() {
        try {
            return this.lava.getNode();
        } catch (e) {
            return null;
        }
    }

    get state() {
        return this._state;
    }

    set state(new_value) {
        this._state = State[new_value];
    }

    init() {
        this.modules.commandRegistrar.registerCommands('Music', import.meta.url);

        return true;
    }

    initScope() {
        this.reset(true);
    }

    active() {
        return this.state != State.INACTIVE;
    }

    /**
     * @param {TrackObject} track
     * @param {GuildMember} requester
     * @param {boolean} [exception = false]
     */
    addToQueue(track, requester, exception = false) {
        track.requester = requester;

        if (exception) {
            this.cacheSongIfNeeded(track);

            return this.queue.addOnPosition(track, 2);
        }
        this.cacheSongIfNeeded();

        return this.queue.add(track);
    }

    attemptRejoin(data = {}) {
        if (data.type === 'WebSocketClosedEvent') {
            if (data.code === 4014) return this.reset(true);

            this.player?.disconnect();

            setTimeout(() => {
                this.setState('SWITCHING');

                this.join().catch(() => this.reset(true));

                this.playNextTrack();
            }, 150);

            return;
        }

        this.log.error('MUSIC_SYSTEM', 'Rejoin failure, unknown event type:', data);

        this.textChannel.send('Unknown connection failure, shutting down...');

        this.reset(true);
    }

    /**
     * @param {ResolvableTrack} [track = null] The track to queue, if track is null then the next track in queue will be cached (if needed).
     */
    async cacheSongIfNeeded(track = this.queue.getFromPosition(2)) {
        if (track == null) return;

        if (track.needsCaching && !await track.cached())
            await track.getYouTubeEquiv();
    }

    /**
     * Will create a nice embed that looks like a player interface
     */
    async createPlayerEmbed() {
        this.updateSongState();

        const track = this.queue.active();
        if (!track) return;
        if (this.lastPlayer && this.textChannel.lastMessageID == this.lastPlayer.id) {
            this._m.embedUtils.editEmbed(this.lastPlayer, {
                author: { name: track.full_author },
                color: this.songState.color,
                description: `Requested by: **${track.requester}**`,
                thumbnail: { url: track.image ?? track.image},
                title: track.title,
                footer: {
                    text: this.songState.footer
                }
            });

            return;
        }

        this.disableOldPlayer(true);
        if (this.reactionListener) this.reactionListener.cleanup();

        const richEmbed = new MessageEmbed()
                .setAuthor(track.author)
                .setTitle(track.title)
                .setThumbnail(track.image ? track.image : null)
                .setColor(this.songState.color)
                .setDescription(`Requested by: **${track.requester}**`)
                .setFooter(this.songState.footer);
        const newMsg = await this.textChannel.send(richEmbed);

        const emojis = ['⏮️', '⏸', '⏭', '🔁'];

        this.lastPlayer = newMsg;

        const reactionInterface = this.modules.reactionInterface;
        this.reactionListener = reactionInterface.createReactionListener(newMsg, emojis, 'toggle', null, -1);

        this.reactionListener.on('timeout', this.shutdown.instant.bind(this.shutdown));
        this.reactionListener.on('reaction', this.onMusicPlayerAction);
    }

    /**
     * @param {TrackObject} track
     * @param {GuildMember} requester
     * @param {TextChannel} textChannel
     */
    async createQueue(track, requester, textChannel) {
        this.startTime = Date.now();

        this.textChannel = textChannel;

        await this.cacheSongIfNeeded(track);

        if (this.addToQueue(track, requester))
            return this.continueQueue();
        return false;
    }

    /**
     * @returns {boolean} True if no problem occured.
     */
    async continueQueue() {
        this.setState('PLAYING');

        if (await this.playTrack()) {
            await this.createPlayerEmbed();

            return true;
        }
        return false;
    }

    /**
     * Will disable the last musicPlayer of our bot
     * @param {boolean} [force=false] If the old player should be forcefully disabled no matter what
     */
    disableOldPlayer(force = false) {
        if (this.lastPlayer && !this.lastPlayer.deleted && (this.textChannel.lastMessageID != this.lastPlayer.id || force)) {
            this._m.embedUtils.editEmbed(this.lastPlayer, {
                color: '#4f545c'
            });

            this.lastPlayer.reactions.removeAll()
            .catch(err => {
                this.textChannel.send(`Unknown error occured\nThis generated the following error: \`\`\`js\n${err.stack}\`\`\`Contact ${this._m.config.creator} on Discord if this keeps occuring.`);
            });
        }
    }

    /**
     * Disconnects the player if one exists
     */
    disconnect() {
        if (this.player) {
            this.player.removeAllListeners();

            this.player.disconnect();
        }
        this.player = null;
        this.voiceChannel = null;
    }

    /**
     * @param {string[]} args
     * @param {Message} msg
     * @param {GuildMember} requester
     * @param {VoiceChannel} voiceChannel
     * @param {boolean} exception
     */
    async handle(args, msg, requester, voiceChannel, exception = false) {
        if (this.state !== State.INACTIVE) this.setState('PROCESSING');

        const noticeMsg = msg.channel.send('🔍 `Looking up your request...` 🔍');

        this.join(voiceChannel).catch(err => {
            const embed = new MessageEmbed();

            switch (err.message.toLowerCase()) {
                case 'voicechannel full': {
                    embed
                        .setTitle('Channel Full')
                        .setColor('#ff0033')
                        .setDescription('Voicechannel is full, try kicking someone or make the voicechannel size larger.');

                    break;
                }
                case 'missing permissions': {
                    embed
                        .setTitle('Insufficient permissions')
                        .setColor('#ff0033')
                        .setDescription('I do not have permission to join your channel.');

                    break
                }
                case 'no lavalink nodes': {
                    embed
                        .setTitle('No Audio Nodes')
                        .setColor('#ff0033')
                        .setDescription('There don\'t appear to be any audio servers connected, request failed...');

                    break;
                }
                default: {
                    embed
                        .setTitle('Unknown Error occured.')
                        .setColor('#ff0033')
                        .setDescription(`\`\`\`${err.stack}\`\`\``);
                }
            }

            msg.channel.send(embed);
        });

        const resolver = this.modules.trackResolver;

        if (!resolver.isValidResolvable(args)) {
            this.utils.createNewChoiceEmbed(msg, args.join(' '), noticeMsg, exception);

            return true;
        }

        const { type, data } = await resolver.resolve(args[0].toString());

        if (!type) {
            noticeMsg.then(msg => msg.delete());

            const embed = new MessageEmbed()
                .setTitle('I could not find the track you requested')
                .setDescription(`No results returned for ${args.join(' ')}.`)
                .setColor('#ed4337');

            msg.channel.send(embed);

            return true;
        }

        if (data instanceof Array) {
            msg.channel.send(`Successfully added ${type}!`);

            for (const item of data) {
                if (!await this.handleData(item, requester, msg, voiceChannel, null, false, false)) break;
            }

            noticeMsg.then(msg => msg.delete());

            return true;
        }

        return this.handleData(data, requester, msg, voiceChannel, noticeMsg, exception);
    }

    /**
     * @param {TrackObject} track
     * @param {GuildMember} requester
     * @param {Message} msg
     * @param {VoiceChannel} voiceChannel
     * @param {Message} [noticeMsg = null]
     * @param {boolean} [exception = false]
     * @param {boolean} [spam = false]
     */
    async handleData(track, requester, msg, voiceChannel, noticeMsg = null, exception = false, spam = false) {
        if (noticeMsg) noticeMsg.then(msg => msg.delete());

        if (this.shutdown.type == 'leave') {
            this.reset(false);
        }

        if (this.active()) {
            if (this.isDamonInVC(voiceChannel) || !spam) {
                if (!this.addToQueue(track, requester, exception)) {
                    msg.channel.send(`The queue is full, this server is limited to ${this.queue.maxQueue} tracks.`)
                        .then(msg => msg.delete({timeout: 5e3}));

                    return false;
                }

                if (spam) msg.channel.send(exception ? `Added song *next up* **${track.title}**` : `Added song **${track.title}**`);

                return true;
            }

            msg.reply('you aren\'t in my voice channel! 😣')
                .then(msg => msg.delete({ timeout: 5e3 }));

            return false;
        }

        if (await this.createQueue(track, requester, msg.channel) && spam) {
            msg.channel.send(`Playback starting with **${track.title}**`);
        }
        return true;
    }

    /**
     * @param {VoiceChannel} voiceChannel
     */
    isDamonInVC(voiceChannel) {
        if (!voiceChannel) return false;
        return voiceChannel.members?.has(this._m.user.id);
    }

    nodeError(err) {
        this.log.error('MUSIC_SYSTEM', 'Node encountered an error:', err);
    }

    async join(voiceChannel = this.voiceChannel) {
        if (!voiceChannel || !voiceChannel instanceof Discord.VoiceChannel) throw new Error(`Join method expects a VoiceChannel instance.`);

        if (!this.isDamonInVC(voiceChannel)) {
            if (!voiceChannel.guild.me.hasPermission('ADMINISTRATOR')) {
                if (voiceChannel.full) {
                    throw new Error('VoiceChannel full');

                    this.shutdown.instant();

                    return false;
                }

                if (!voiceChannel.joinable) {
                    this.shutdown.instant();

                    throw new Error('Missing Permissions');

                    return false;
                }
            }
        }

        this.player?.removeAllListeners();
        this.player = this.node?.joinVoiceChannel({
            guildID: voiceChannel.guild.id,
            voiceChannelID: voiceChannel.id
        });

        if (!this.player) throw new Error('No LavaLink Nodes');

        // Reconnect no matter what
        this.player.then(player => {
            player.on('closed', this.attemptRejoin.bind(this));
            player.on('nodeDisconnect', this.attemptRejoin.bind(this));

            player.on('start', this.soundStart.bind(this));
            player.on('error', this.nodeError.bind(this));
            player.on('end', this.soundEnd.bind(this));

            this.player = player;
        });

        this.voiceChannel = voiceChannel;
    }

    /**
     * Method pauses music playback
     * @returns {boolean} Returns true if playback got paused, false if it already was paused.
     */
    pausePlayback() {
        if (!this.paused) {
            this.player.setPaused(true);

            this.paused = true;

            this.updateSongState();

            this._m.embedUtils.editEmbed(this.lastPlayer, {
                color: this.songState.color,
                footer: {
                    text: this.songState.footer
                }
            });

            return true;
        }

        return false;
    }

    /**
     * @returns {boolean} True on success, false otherwise
     */
    pauseToggle() {
        return this.paused ? this.resumePlayback() : this.pausePlayback();
    }

    /**
     * Toggles through all the repeat modes
     * @returns {boolean} False if the current song was removed, true otherwise.
     */
    playerRepeatToggle() {
        if (!this.queue.active()) return false;

        const queueRepeat = this.queue.repeat;
        const songRepeat = (this.queue.active()).repeat;

        if (!songRepeat) {
            if (!queueRepeat) {
                (this.queue.active()).repeat = true;
            }
            else {
                (this.queue.active()).repeat = false;
            }
            this.queue.repeat = false;
        }
        else {
            this.queue.repeat = true;
            (this.queue.active()).repeat = false;
        }

        this.updateSongState();

        this._m.embedUtils.editEmbed(this.lastPlayer, {
            color: this.songState.color,
            footer: {
                text: this.songState.footer
            }
        });

        return true;
    }

    playPreviousTrack() {
        return this.skipTo(-1);
    }

    playNextTrack() {
        const activeTrack = this.queue.active();

        if (!activeTrack) this.queue.removeOnPosition(1);
        else if (activeTrack.repeat) this.continueQueue();

        if (this.state !== State.SWITCHING) {
            if (!this.queue.getFromPosition(2)) {
                if (this.queue.repeat) {
                    this.queue.rewind();

                    this.continueQueue();

                    return;
                }

                this.disableOldPlayer(true);
                const msg = this.textChannel.send(`Queue has been concluded and the bot will leave in 5 minutes, type the \`restart\` command to requeue your the old queue (only if within those same 5 minutes).`);
                this.shutdown.delay('leave', 3e5, (msg) => msg.then(msg => { if (!msg.deleted) msg.delete() }), msg);

                return;
            }

            this.queue.shift();
        }

        this.continueQueue();
    }

    async playTrack() {
        if (!this.player) return false;
        if (this.player instanceof Promise) this.player = await this.player;

        const currentSong = this.queue.active();
        if (!currentSong || currentSong.broken) {
            this.textChannel.send(`No equivalent video could be found on YouTube for **${currentSong ? currentSong.title : '{ REMOVED/UNKNOWN TRACK }'}**`);

            this.playNextTrack();

            return false;
        }

        await this.cacheSongIfNeeded(currentSong);

        //this.soundPrepare();

        try {
            await this.player.playTrack(currentSong.track, { noReplace: false });
        } catch (e) {
            this.log.warn('MUSIC_SYSTEM', 'Failed to playTrack, the instance might be broken:', currentSong.track ?? currentSong);

            this.playNextTrack();

            return false;
        }

        await this.player.setVolume(this.volume);

        this.cacheSongIfNeeded();

        return true;
    }

    /**
     * @param {string|number} query This can be a string identifying the track or
     */
    removeSong(query) {
        query = !query || query.toString().length === 0 ? 0 : query.toString();

        if (!isNaN(query)) {
            query = parseInt(query);

            if (query < -this.queue.maxPrequeue || query == 0) return null;

            return this.queue.removeOnPosition(query);
        }

        query = query.toLowerCase();

        const results = [];
        const start = this.queue.start;

        for (let i = start; i < this.queue.length; i++) {
            if (results.length > 1) break;

            const track = this.queue[i];
            if (!track) continue;

            if (track.title.toLowerCase().includes(query)) {
                results.push(i);
            }
        }

        if (results.length == 1) return this.queue.removeOnPosition(results[0] - this.queue.maxPrequeue);
        return null;
    }

    /**
     * Enables entire queue repeat
     * @returns {boolean} Returns the new boolean state of the queue
     */
    repeatQueueToggle() {
        const queueRepeat = this.queue.repeat;

        if (this.queue.active() != null) {
            (this.queue.active()).repeat = false;
        }

        this.queue.repeat = !queueRepeat;

        this.updateSongState();
        this._m.embedUtils.editEmbed(this.lastPlayer, {
            color: this.songState.color,
            footer: {
                text: this.songState.footer
            }
        });

        return this.queue.repeat;
    }

    /**
     * Repeat toggle for the command
     * @returns {boolean} The new boolean state of the current song repeat
     */
    repeatToggle() {
        const songRepeat = (this.queue.active()).repeat;

        (this.queue.active()).repeat = !songRepeat;

        this.updateSongState();
        this._m.embedUtils.editEmbed(this.lastPlayer, {
            color: this.songState.color,
            footer: {
                text: this.songState.footer
            }
        });

        return (this.queue.active()).repeat;
    }

    /**
     * @param {boolean} [disconnect = true] If the bot should be disconnect on reset
     */
    reset(disconnect = true) {
        this.setState('INACTIVE');

        if (disconnect) this.disconnect();

        this.disableOldPlayer(true);

        this.queue.reset();
        this.shutdown.cancel();

        Object.assign(this, SystemReset);
    }

    /**
     * Resumes the music
     * @returns {boolean} True if the playback was resumed, false if it is already playing.
     */
    resumePlayback() {
        if (this.paused) {
            this.player.setPaused(false);

            this.paused = false;

            this.updateSongState();

            this._m.embedUtils.editEmbed(this.lastPlayer, {
                color: this.songState.color,
                footer: {
                    text: this.songState.footer
                }
            });

            return true;
        }

        return false;
    }

    /**
     * @param {number} queueNumber A number that exists in queue
     * @returns {boolean} False if invalid queueNumber was given, true on success
     */
    async skipTo(queueNumber) {
        if (queueNumber == 1) return true;
        if (isNaN(queueNumber) || queueNumber < -this.queue.maxPrequeue || queueNumber == 0) return false;

        queueNumber = parseInt(queueNumber);

        if (!this.queue.hasOnPosition(queueNumber)) return false;

        const loopCount = queueNumber < 0 ? (queueNumber*-1) : queueNumber - 1;
        this.paused = false;
        this.setState('SWITCHING');

        const nextSong = this.queue.getFromPosition(queueNumber);
        await this.cacheSongIfNeeded(nextSong);

        for (let i = 0; i < loopCount; i++) {
            if (queueNumber < 0) this.queue.unshift(null);
            else this.queue.shift(null);
        }

        if (!await this.player.stopTrack()) this.soundEnd();

        return true;
    }

    /**
     * Sets the volume on the active stream
     * @param {number} volume
     * @returns {boolean} False if unchanged, true otherwise
     */
    setVolume(volume) {
        if (this.volume == volume) {
            return false;
        }

        this.player.setVolume(volume);
        this.volume = volume;

        return true;
    }

    /**
     * @param {Object} [end={}] By default an empty object to prevent if statements errrors.
     */
    soundEnd(end = {}) {
        this.end = end;

        if (end.type === 'TrackStuckEvent') {
            clearTimeout(this.trackStuckTimeout);
            this.trackStuckTimeout = setTimeout(async () => {
                if (!await this.player.stopTrack()) this.soundEnd();
            }, 15e3);

            return;
        }

        if (this.state !== State.SWITCHING) this.setState('ENDING');

        //this.player.removeAllListeners();

        const currentSong = this.queue.active();
        if (end.reason === 'LOAD_FAILED') {
            this.textChannel.send(`The uploader has not made **${currentSong.title}** available in your country.`);

            this.playNextTrack();

            return;
        }

        this.log.info('MUSIC_SYSTEM', `Finished track: ${currentSong ? currentSong.title : '{ REMOVED SONG }'}`);

        this.playNextTrack();
    }

    /**
     * Fired when Lavalink successfully begins playing a track.
     */
    soundStart() {
        const currentSong = this.queue.active();

        if (this.end.type == 'TrackStuckEvent') return clearTimeout(this.trackStuckTimeout);
        if (currentSong) this._m.emit('trackPlayed', currentSong);

        this.log.info('MUSIC_SYSTEM', 'Started track: ' + currentSong ? currentSong.title : '{ REMOVED SONG }');
    }

    setState(state) {
        this.log.info('MUSIC_SYSTEM', `Changed MusicSystem state: "${state}"`)

        this.state = state;
    }

    /**
     * This method dynamically updates the active music player embed, calling this will update the embed based on the most recent internal checks
     */
    updateSongState() {
        this.songState = {
            footer: 'Repeat: Off',
            color: '#32cd32'
        };

        if (this.queue.active() == null) {
            this.songState.footer = 'Song has been removed and repeat has been disabled.';
        }
        else if ((this.queue.active()).repeat) {
            this.songState.footer = 'Repeat: On';
            this.songState.color = '#cccccc';
        }

        if (this.queue.repeat && this.queue.active() && !(this.queue.active()).repeat) {
            this.songState.footer += ' | Playlist repeat: On';
        }

        if (this.paused) {
            this.songState.footer = `Paused | ${this.songState.footer}`;
            this.songState.color = '#dd153d';
        }
    }

    /**
     * @private
     * @param {Guild} guild
     * @param {GuildMember} serverMember
     * @param {VoiceChannel} voiceChannel
     */
    _voiceJoin(guild, serverMember, voiceChannel) {
        const server = this.servers.get(guild, false);

        if (!server || !server.music.active()) return;

        if (server.music.shutdown.type == 'time' && voiceChannel.members.size > 1) {
            server.music.shutdown.cancel();
        }

        server.dj.join(serverMember);
    }

    /**
     * @private
     * @param {Guild} guild
     * @param {GuildMember} serverMember
     * @param {VoiceChannel} voiceChannel
     */
    _voiceLeave(guild, serverMember, voiceChannel) {
        const server = this.servers.get(guild, false);

        if (!server || !server.music.active() || !server.music.isDamonInVC(voiceChannel)) return;

        if (voiceChannel.members.size == 1 && !server.music.shutdown.type) {
            const msg = server.music.textChannel.send(`The queue will be destroyed within 5 minutes, rejoin within that time to resume music playback.`);

            server.music.shutdown.delay('time', 3e5, (msg) => msg.then(msg => { if (!msg.deleted) msg.delete() }), msg);
        }
        server.dj.remove(serverMember);

        if (!voiceChannel.guild.me.voice.channel) {
            server.music.shutdown.instant();
        }
    }
}
