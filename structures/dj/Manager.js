import { GuildMember } from 'discord.js'

import DJUser from './User.js'
import { DJMode } from '../../util/Constants.js'

export default class DJManager {
    /**
     * @param {MusicSystem} music
     */
    constructor(music) {
        this.music = music;

        this.revokeTime = 12e4;

        this.reset(true);
    }

    upgrade(oldMap) {
        this.users = new Map(oldMap);
    }

    /**
     * @param {GuildMember}
     */
    add(serverMember) {
        if (this.mode != DJMode['MANAGED']) return;

        this.users.set(serverMember.id, new DJUser(this, serverMember));
    }

    /**
     * @param {GuildMemberResolvable} guildMemberResolvable
     */
    has(guildMemberResolvable) {
        if (this.mode != DJMode['MANAGED']) return true;

        const serverMemberId = guildMemberResolvable instanceof GuildMember ? guildMemberResolvable.id : guildMemberResolvable;

        return this.users.has(serverMemberId);
    }

    /**
     * @param {GuildMember}
     */
    join(serverMember) {
        if (this.mode != DJMode['MANAGED']) return;

        const djUser = this.users.get(serverMember.id);

        if (djUser) {
            djUser.clear();
        }
    }

    /**
     * @param {boolean} [hard=false]
     */
    reset(hard = false) {
        if (hard) this.mode = this.music.getModule('guildSetting').get(this.music.server.id, 'dj_mode') || DJMode['FREEFORALL'];
        this.playlistLock = false;

        if (!this.users)
            this.users = new Map();

        this.users.forEach((djUser) => {
            djUser.clear();

            this.users.delete(djUser.id);
        });
    }

    /**
     * @param {GuildMember}
     */
    remove(serverMember) {
        if (this.mode != DJMode['MANAGED']) return;

        const djUser = this.users.get(serverMember.id);

        if (djUser && this.size == 1) {
            djUser.revokeDelay(this.revokeTime);
        }
    }

    /**
     * @param {GuildMember}
     */
    resign(serverMember) {
        const djUser = this.users.get(serverMember.id);
        djUser.clear();

        if (djUser && this.size == 1) {
            this.setMode(DJMode['FREEFORALL']);

            this.music.channel.send(`${serverMember} has resigned as DJ, all users in voice channel can now use music commands.`);

            return;
        }

        this.users.delete(djUser.id);
    }

    /**
     * @param {number} mode
     * @param {boolean} persist
     */
    setMode(mode, persist = false) {
        if (persist) {
            this.music.server.options.update('djMode', mode);

            this.music.getModule('guildSetting').set(this.music.server.id, 'dj_mode', mode);
        }

        this.mode = mode;

        this.reset();
    }
}
