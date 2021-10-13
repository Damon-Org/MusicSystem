import Modules from '@/src/Modules.js'

export default class MusicCommand extends Modules.dj.DJCommand {
    constructor(main) {
        super(main);
    }

    beforeRun(command) {
        if (this.music.active()) {
            const voiceChannel = this.music.voiceChannel;
            if (!voiceChannel) {
                this.music.reset(true);

                return true;
            }

            if (!this.music.isDamonInVC(voiceChannel)) {
                this.music.reset(true);

                return true;
            }
        }

        if (!this.voiceChannel) {
            this.send('Please join a voice channel before using this command!');

            return false;
        }

        return true;
    }
}
