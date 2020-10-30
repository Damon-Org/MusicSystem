import MusicServerModule from '../modules/MusicServerModule.js'
import { MessageEmbed } from 'discord.js'
import MusicQueue from './Queue.js'
import MusicUtils from '../../util/Music.js'
import ShutdownManager from '../../util/ShutdownManager.js'
import LavaTrack from '../track/LavaTrack.js'

export default class MusicSystem extends MusicServerModule {
    queue = new MusicQueue();
    shutdown = new ShutdownManager(this);
    util = new MusicUtils(this);

    /**
     * @param {Main} main
     * @param {Server} server
     */
    constructor(main, server) {
        super(main, server);
    }

    /**
     * @returns {Shoukaku} The class to interact with Lavalin nodes.
     */
    get lava() {
        return this._m.modules.lavalink.conn;
    }

    /**
     * @returns Returns a lavalink node that is the least loaded.
     */
    get node() {
        return this.lava.getNode();
    }

    /**
     * Adds a song to the queue together with its requester
     * @param {LavaTrack|SpotifyTrack} track Data found by the LavaLink REST APi
     * @param {GuildMember} serverMember A Discord.GuildMember instance
     * @param {boolean} [exception=false] If the song should be played next up or handled normally
     * @returns {boolean} Returns the result of MusicQueue#add
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

    /**
     * @param {ResolvableTrack} [track=null] The track to queue, if track is null then the next track in queue will be cached (if needed).
     */
    async cacheSongIfNeeded(track = null) {
        if (track == null) {
            track = this.queue.getFromPosition(2);

            if (track == null) return;
        }

        if (track.needsCaching && !await track.cached())
            await track.getYouTubeEquiv();
    }

    /**
     * Will pass on to the next song
     * @param {VoiceChannel} [voiceChannel=null] A Discord.VoiceChannel instance
     * @returns {boolean} If no problems occured.
     */
    async continueQueue(voiceChannel = null) {
        if (await this.playSong(voiceChannel)) {
            this.ended = false;

            await this.createNewPlayer();

            return true;
        }

        return false;
    }

    /**
     * Will create a nice embed that looks like a player interface
     */
    async createNewPlayer() {
        this.updateSongState();

        const track = this.queue.active();
        if (this.lastMsg && this.channel.lastMessageID == this.lastMsg.id) {
            this._m.embedUtils.editEmbed(this.lastMsg, {
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
        const newMsg = await this.channel.send(richEmbed);

        const emojis = ['⏮️', '⏸', '⏭', '🔁'];

        this.lastMsg = newMsg;

        const reactionInterface = this.modules.reactionInterface;
        this.reactionListener = reactionInterface.createReactionListener(newMsg, emojis, 'toggle', null, -1);

        this.reactionListener.on('timeout', () => this.shutdown.instant());
        this.reactionListener.on('reaction', (emoji, user) => this.onMusicPlayerAction(emoji, user));
    }

    /**
     * Sets the dedicated TextChannel and then passes the Song to MusicSystem#AddToQueue
     * @param {LavaTrack|SpotifyTrack} track Data found by the LavaLink REST APi
     * @param {GuildMember} requester
     * @param {TextChannel} textChannel A Discord.TextChannel instance
     */
    async createQueue(track, requester, textChannel) {
        this.startTime = Date.now();

        this.channel = textChannel;

        track.requester = requester;
        await this.cacheSongIfNeeded(track);

        this.addToQueue(track, requester);
    }

    /**
     * Will disable the last musicPlayer of our bot
     * @param {boolean} [force=false] If the old player should be forcefully disabled no matter what
     */
    disableOldPlayer(force = false) {
        if (this.lastMsg && !this.lastMsg.deleted && (this.channel.lastMessageID != this.lastMsg.id || force)) {
            this._m.embedUtils.editEmbed(this.lastMsg, {
                color: '#4f545c'
            });

            this.lastMsg.reactions.removeAll()
            .catch(err => {
                this.channel.send(`Unknown error occured\nThis generated the following error: \`\`\`js\n${err.stack}\`\`\`Contact ${this._m.config.creator} on Discord if this keeps occuring.`);
            });
        }
    }

    /**
     * Disconnects the player if one exists
     */
    disconnect() {
        if (this.player) this.player.disconnect();
    }

    /**
     * Checks if a player exists and returns it, if none exist or the bot disconnected for some reason then a new connect/player is created and returned.
     * @param {VoiceChannel} voiceChannel
     * @returns {Promise<LavaPlayer>|LavaPlayer}
     */
    getPlayer(voiceChannel) {
        const player = this.lava.getPlayer(voiceChannel.guild.id);
        if (player && this.isDamonInVC(voiceChannel))
            return player;

        if (player) player.disconnect();

        return this.node.joinVoiceChannel({
            guildID: voiceChannel.guild.id,
            voiceChannelID: voiceChannel.id
        });
    }

    /**
     * Checks if the bot is in a given voice channel.
     * @param {VoiceChannel} voiceChannel A Discord.VoiceChannel instance
     * @returns {boolean} True if Damon is in a voiceChannel, false otherwise.
     */
    isDamonInVC(voiceChannel) {
        if (!voiceChannel) return false;
        return voiceChannel.members.has(this._m.user.id);
    }

    nodeError(err) {
        this.shutdown.instant();
    }

    /**
     * Will handle any action on MusicPlayer Reactions
     * @param {string} emoji A unicode string of the emoji
     * @param {Message} msgObj
     * @param {User} user
     */
    async onMusicPlayerAction(emoji, user) {
        if (!this.lastMsg || !this.voiceChannel.members.has(user.id)) return;

        switch (emoji) {
            case '⏮️': {
                this.playPrevious();
                break;
            }
            case '⏸': {
                this.pauseToggle();
                break;
            }
            case '⏭': {
                this.player.stopTrack();
                break;
            }
            case '🔁': {
                if (!this.playerRepeatToggle()) {
                    const newMsg = await this.lastMsg.channel.send('The currently playing song was removed and repeat has been disabled.');

                    newMsg.delete({timeout: 5000});
                }
                break;
            }
        }
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

            this._m.embedUtils.editEmbed(this.lastMsg, {
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
     * Will toggle resume/pause depending on the state of the active song
     */
    pauseToggle() {
        if (this.paused) {
            this.resumePlayback();

            return;
        }

        this.pausePlayback();
    }

    /**
     * Will go through several checks of things that have to get updated before moving on to the next song
     */
    async playNext() {
        const activeSong = this.queue.active();

        if (activeSong == null) {
            this.queue.remove(null);
        }
        else if (activeSong.repeat) {
            this.continueQueue();

            return;
        }

        if (!this.doNotSkip && this.queue.getFromPosition(2) == null) {
            if (this.queue.repeat) {
                this.queue.rewind();

                this.continueQueue();
                return;
            }

            this.disableOldPlayer(true);
            this.channel.send(`Queue has been concluded and the bot will leave in 5 minutes, type the \`restart\` command to requeue your the old queue (only if within those same 5 minutes).`);
            this.shutdown.delay('leave', 3e5);

            return;
        }

        if (!this.doNotSkip) {
            this.queue.shift();
        }
        this.doNotSkip = false;

        this.continueQueue();
    }

    /**
     * This will put the queue back to the previous song and then play the next song
     * @returns {boolean} True on success, false when no more previous songs
     */
    async playPrevious() {
        this.doNotSkip = true;

        if (this.queue.active() == null) {
            // Remove the current active song
            this.queue.remove(null);

            this.queue.unshift(null);

            if (!await this.player.stopTrack()) this.soundEnd();
        }
        else if ((this.queue.active()).repeat) {
            (this.queue.active()).repeat = false;
        }

        if (this.queue.getFromPosition(-1) != null) {
            this.queue.unshift(null);

            if (!await this.player.stopTrack()) this.soundEnd();

            return true;
        }

        this.doNotSkip = false;

        return false;
    }

    /**
     * Toggles through all the repeat modes
     * @returns {boolean} False if the current song was removed, true otherwise.
     */
    playerRepeatToggle() {
        if (this.queue.active() == null) {
            return false;
        }

        const
            queueRepeat = this.queue.repeat,
            songRepeat = (this.queue.active()).repeat;

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

        this._m.embedUtils.editEmbed(this.lastMsg, {
            color: this.songState.color,
            footer: {
                text: this.songState.footer
            }
        });

        return true;
    }

    /**
     * @param {VoiceChannel} [voiceChannel=null] A Discord.VoiceChannel instance
     * @returns {boolean} False on failure, true otherwise
     */
    async playSong(voiceChannel = null) {
        if (!this.voiceChannel) {
            if (!this.isDamonInVC(voiceChannel)) {
                if (voiceChannel.full && !voiceChannel.guild.me.hasPermission('ADMINISTRATOR')) {
                    const richEmbed = new MessageEmbed()
                        .setTitle('Channel Full')
                        .setColor('#ff0033')
                        .setDescription('Voicechannel is full, try kicking someone or make the voicechannel size larger.');

                    this.channel.send(richEmbed);

                    this.shutdown.instant();
                    return false;
                }

                if (!voiceChannel.joinable && !voiceChannel.guild.me.hasPermission('ADMINISTRATOR')) {
                    const richEmbed = new MessageEmbed()
                        .setTitle('Insufficient permissions')
                        .setColor('#ff0033')
                        .setDescription('I do not have permission to join your channel.');

                    this.channel.send(richEmbed);

                    this.shutdown.instant();
                    return false;
                }
            }

            this.player = await this.getPlayer(voiceChannel);

            //this.player.on('closed', this.playerListener['closed'] = (reason) => this.playerDisconnected(reason));

            this.voiceChannel = voiceChannel;
        }

        const currentSong = this.queue.active();
        if (currentSong.broken) {
            this.channel.send(`No equivalent video could be found on YouTube for **${currentSong.title}**`);

            this.playNext();

            return false;
        }

        await this.cacheSongIfNeeded(currentSong);

        try {
            await this.player.playTrack(currentSong.track, { noReplace: false })
        }
        catch (e) {
            this._m.log.warn('MUSIC_SYSTEM', 'Failed to playTrack, the instance might be broken:', currentSong.track ?? currentSong);

            this.playNext();

            return false;
        }
        await this.player.setVolume(this.volume);

        this.player.on('start', () => this.soundStart());

        this.cacheSongIfNeeded();

        //this.player.on('closed', () => this.soundEnd(end));
        //this.player.on('nodeDisconnect', endFunction);

        return true;
    }

    /**
     * Will return true if a valid queue exists
     * @returns {boolean}
     */
    queueExists() {
        return (this.queue.active() != null && this.queue.length >= this.queue.maxPrequeue) || this.soundActive;
    }

    /**
     * @param {number} queueNumber A number that exists in queue
     * @returns {boolean} True if a song was removed on the given position, false otherwise
     */
    removeSong(queueNumber) {
        if (!queueNumber || queueNumber == '' || queueNumber.length == 0) {
            queueNumber = 1;
        }
        else if (isNaN(queueNumber) || queueNumber < -this.queue.maxPrequeue || queueNumber == 0) return false;

        queueNumber = parseInt(queueNumber);

        if (!this.queue.hasOnPosition(queueNumber)) return false;

        return this.queue.removeOnPosition(queueNumber);
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
        this._m.embedUtils.editEmbed(this.lastMsg, {
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
        this._m.embedUtils.editEmbed(this.lastMsg, {
            color: this.songState.color,
            footer: {
                text: this.songState.footer
            }
        });

        return (this.queue.active()).repeat;
    }

    /**
     * Will reset all variables so our system is ready for requests
     * @param {boolean} [disconnect=true] If the player should be disconnected upon reset.
     */
    reset(disconnect = true) {
        if (disconnect) this.disconnect();

        this.disableOldPlayer(true);

        this.queue.reset();

        if (this.player) this.player.removeAllListeners();

        /**
         * @type {TextChannel}
         */
        this.channel = null;
        /**
         * @type {Message}
         */
        this.lastMsg = null;

        /**
         * @type {boolean}
         */
        this.doNotSkip = false;
        /**
         * @type {boolean}
         */
        this.soundActive = false;

        /**
         * @type {Object}
         */
        this.end = {};
        /**
         * @type {VoiceChannel}
         */
        this.voiceChannel = null;

        /**
         * @type {boolean}
         */
        this.paused = false;
        /**
         * @type {number}
         */
        this.startTime = 0;
        /**
         * @type {number}
         */
        this.volume = 30;

        this.updateSongState();
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

            this._m.embedUtils.editEmbed(this.lastMsg, {
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
        this.doNotSkip = true;
        this.paused = false;

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
            this.trackStuckTimeout = setTimeout(() => {
                this.soundEnd();
            }, 5e3);

            return;
        }

        this.soundActive = false;

        this.player.removeAllListeners();

        if (end.reason === 'LOAD_FAILED') {
            this.playSong();

            return;
        }

        const currentSong = this.queue.active();

        this._m.log.info('MUSIC_SYSTEM', `Finished track: ${currentSong ? currentSong.title : '{ REMOVED SONG }'}`);

        this.playNext();
    }

    soundStart() {
        const currentSong = this.queue.active();

        this.soundActive = true;

        this._m.log.info('MUSIC_SYSTEM', 'Started track: ' + currentSong ? currentSong.title : '{ REMOVED SONG }');

        if (this.end.type == 'TrackStuckEvent') {
            clearTimeout(this.trackStuckTimeout);

            return;
        }
        
        this._m.emit('trackPlayed', currentSong);

        this.player.on('error', (error) => this.nodeError(error));

        this.player.on('end', (end) => this.soundEnd(end));
    }

    /**
     * Will start the queue in the given voicechannel
     * @param {VoiceChannel} voiceChannel A Discord.VoiceChannel instance
     * @returns {boolean} Result of MusicSystem#continueQueue
     */
    async startQueue(voiceChannel) {
        return await this.continueQueue(voiceChannel);
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
}
