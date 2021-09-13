import { ButtonInteraction } from "discord.js";

/**
 * 
 * @param {ButtonInteraction} interaction 
 */
function previousInteraction(interaction) {
    this.playPreviousTrack();
}

/**
 * 
 * @param {ButtonInteraction} interaction 
 */
function playPauseInteraction(interaction) {
    this.pauseToggle();
}

/**
 * 
 * @param {ButtonInteraction} interaction 
 */
async function skipInteraction(interaction) {
    if (!await this.player.stopTrack())
        this.soundEnd();
}

/**
 * 
 * @param {ButtonInteraction} interaction 
 */
function repeatInteraction(interaction) {
    if (!this.playerRepeatToggle())
        this.lastPlayer.channel.send('The currently player song was removed and repeat has been disabled.')
            .then(msg => setTimeout(msg.delete.bind(msg), 5e3));
}

/**
 * Will handle any action on MusicPlayer Reactions
 * @param {ButtonInteraction} interaction A unicode string of the emoji
 */
export async function OnMusicPlayerAction (interaction) {
    if (!this.lastPlayer || !this.voiceChannel.members.has(interaction.user.id)) return;
    if (this.lastPlayer.id != interaction.message.id) return;

    switch (interaction.customId) {
        case 'previous':
            previousInteraction.call(this, interaction);
            break;
        case 'play_pause':
            playPauseInteraction.call(this, interaction);
            break;
        case 'next':
            skipInteraction.call(this, interaction);
            break;
        case 'repeat':
            repeatInteraction.call(this, interaction);
            break;
    }

    await interaction.deferUpdate();
}

export default {
    OnMusicPlayerAction
};
