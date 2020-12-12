/**
 * Will handle any action on MusicPlayer Reactions
 * @param {string} emoji A unicode string of the emoji
 * @param {Message} msgObj
 * @param {User} user
 */
export async function OnMusicPlayerAction(emoji, user) {
    if (!this.lastPlayer || !this.voiceChannel.members.has(user.id)) return;

    switch (emoji) {
        case '⏮️': {
            this.playPreviousTrack();
            break;
        }
        case '⏸': {
            this.pauseToggle();
            break;
        }
        case '⏭': {
            //this.soundEnd();
            if (!await this.player.stopTrack()) this.soundEnd();
            break;
        }
        case '🔁': {
            if (!this.playerRepeatToggle()) {
                this.lastPlayer.channel.send('The currently playing song was removed and repeat has been disabled.')
                    .then(msg => msg.delete({timeout: 5000}));
            }
            break;
        }
    }
}

export default {
    OnMusicPlayerAction
};
