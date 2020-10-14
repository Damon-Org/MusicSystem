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

        Object.assign(this, new MusicSystem(this));
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
