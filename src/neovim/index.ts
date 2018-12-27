import { remote } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as toml from 'toml';
import Popupmenu from './popupmenu';
import Process from './process';
import Screen from './screen';
import Store from './store';

interface IConfig {
    width: number;
    height: number;
    font_size: number;
    font_family: string;
    line_height: number;
}

export default class Neovim {
    public store: Store;
    public process: Process;
    public screen: Screen;
    public popupmenu: Popupmenu;

    constructor() {
        this.store = new Store();
        this.process = new Process(this.store);
        this.screen = new Screen(this.store);
        this.popupmenu = new Popupmenu(this.store);

        const configPath = path.join(process.env.HOME, '.config', 'elevim', 'config.toml');
        fs.readFile(configPath, { encoding: 'utf8' }, (_, data: Buffer) => {
            const config: IConfig = toml.parse(data.toString());
            remote.getCurrentWindow().setSize(config.width, config.height);
            this.store.emit('update-specified-font', config.font_size, config.font_family, config.line_height);
            this.process.attach();
        });
    }
}
