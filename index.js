import ServerModule from './structures/modules/ServerModule.js'
import Constants from './util/Constants.js'
import MusicSystem from './structures/music/System.js'

export default class Music extends ServerModule {
    /**
     * @param {Main} main
     * @param {Guild} server
     */
    constructor(main, server) {
        super(main, server);

        this.register(MusicSystem, {
            name: 'music',
            scope: 'server',
            requires: [
                'api',
                'eventExtender',
                'guildSetting',
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

        this._music = new MusicSystem();
        Object.assign(this, this._music);
    }

    get constants() {
        return Constants;
    }

    /**
     * @returns {DJManager}
     */
    get djManager() {
        return this._music.djManager;
    }

    /**
     * @returns {Shoukaku} The class to interact with Lavalin nodes.
     */
    get lava() {
        return this._m.getModule('lavalink').conn;
    }

    /**
     * @returns Returns a lavalink node that is the least loaded.
     */
    get node() {
        return this.lava.getNode();
    }

    /**
     * @returns {Queue}
     */
    get queue() {
        return this._music.queue;
    }

    /**
     * @returns {ShutdownManager}
     */
    get shutdown() {
        return this._music.shutdown;
    }

    /**
     * @returns {MusicUtils}
     */
    get util() {
        return this._music.util;
    }

    /**
     * @private
     * @param {Guild} guild
     * @param {GuildMember} serverMember
     * @param {VoiceChannel} voiceChannel
     */
    _voiceJoin(guild, serverMember, voiceChannel) {
        const server = this.servers.get(guild);

        if (!server.music.queueExists()) return;

        if (server.music.shutdown.type() == 'time' && voiceChannel.members.size > 1) {
            server.music.shutdown.cancel();
        }

        server.music.djManager.join(serverMember);
    }

    /**
     * @private
     * @param {Guild} guild
     * @param {GuildMember} serverMember
     * @param {VoiceChannel} voiceChannel
     */
    _voiceLeave(guild, serverMember, voiceChannel) {
        const server = this.servers.get(guild);

        if (!server.music.queueExists() || !server.music.isDamonInVC(voiceChannel)) return;

        if (voiceChannel.members.size == 1 && !server.music.shutdown.type()) {
            server.music.shutdown.delay('time', 3e5);
        }
        server.music.djManager.remove(serverMember);

        if (!voiceChannel.guild.me.voice.channel) {
            server.music.shutdown.instant();
        }
    }

    /**
     * This method is only ran once to setup the module
     * we can abuse this to add our event listeners globally
     */
    setup() {


        return true;
    }
}
