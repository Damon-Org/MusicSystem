import ServerModule from './structures/modules/ServerModule.js'
import MusicQueue from './structures/'

export default class MusicSystem extends ServerModule {
    _djManager = new DJManager(this);
    _queue = new MusicQueue();
    _shutdown = new ShutdownManager(this);
    _util = new MusicUtil(this);

    /**
     * @param {Main} main
     * @param {Guild} server
     */
    constructor(main, server) {
        super(main, server);

        this.register(MusicSystem, {
            name: 'musicSystem',
            scope: 'server',
            requires: [
                'lavalink'
            ]
        });
    }


}
