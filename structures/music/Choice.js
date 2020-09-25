export default class MusicChoice {
    /**
     * @param {YouTubeAPI} youtube
     * @param {String} searchFor
     * @param {Boolean} exception
     */
    constructor(youtube, searchFor, exception) {
        this.yt = youtube;
        this.search = searchFor;
        this.shouldPlayNext = exception;

        /**
         * @type {String}
         */
        this.description = null;
        /**
         * @type {Message}
         */
        this.listener = null;
        /**
         * @param {GuildMember}
         */
        this.requester = null;
        /**
         * @type {VoiceChannel}
         */
        this.voiceChannel = null;
    }

    /**
     * This method will fetch the YT API and generate an embed description as well afterwards
     */
    async genDescription() {
        let data = null;

        for (let i = 0; i < 3 && (!data || data.length == 0); i++) {
            data = await this.yt.search(this.search);
        }

        if (!data || data.length == 0) return false;

        this.description = '```asciidoc\n[CHOOSE A SONG]```\n';
        this.ids = [];

        for (let i = 0; i < 5; i++) {
            this.ids.push(data[i].id);

            this.description += `\`\`\`asciidoc\n[${(i + 1)}] :: ${data[i].title}\`\`\``;
        }

        return true;
    }
}
