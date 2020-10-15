import MusicServerModule from './structures/modules/MusicServerModule.js'
import Constants from './util/Constants.js'

// MusicServerModule does inherintly the same as a ServerModule only that it extends the MusicSystem class
export default class Music extends MusicServerModule {
    /**
     * @param {Main} main
     * @param {Guild} server
     */
    constructor(main, server) {
        super(main, server);

        this.register(Music, {
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
    }

    get constants() {
        return Constants;
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

    /**
     * This method is only ran once to setup the module
     * we can abuse this to add our event listeners globally
     */
    setup() {


        return true;
    }
}
