import MusicSystem from './structures/music/System.js'
import Constants from './util/Constants.js'

// MusicServerModule does inherintly the same as a ServerModule only that it extends the MusicSystem class
export default class Music extends MusicSystem {
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
    }

    get constants() {
        return Constants;
    }

    initScope() {
        this.reset(true);
    }

    /**
     * @private
     * @param {Guild} guild
     * @param {GuildMember} serverMember
     * @param {VoiceChannel} voiceChannel
     */
    _voiceJoin(guild, serverMember, voiceChannel) {
        const server = this.servers.get(guild, false);

        if (!server || !server.music.queueExists()) return;

        if (server.music.shutdown.type() == 'time' && voiceChannel.members.size > 1) {
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

        if (!server || !server.music.queueExists() || !server.music.isDamonInVC(voiceChannel)) return;

        if (voiceChannel.members.size == 1 && !server.music.shutdown.type()) {
            server.music.shutdown.delay('time', 3e5);
        }
        server.dj.remove(serverMember);

        if (!voiceChannel.guild.me.voice.channel) {
            server.music.shutdown.instant();
        }
    }
}
