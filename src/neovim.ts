import { remote } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as toml from 'toml';
import Cmdline from './neovim/cmdline';
import Finder from './neovim/finder';
import Markdown from './neovim/markdown';
import Popupmenu from './neovim/popupmenu';
import Process from './neovim/process';
import Screen from './neovim/screen';
import Store from './neovim/store';
import Tabline from './neovim/tabline';

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
    public tabline: Tabline;
    public cmdline: Cmdline;
    public finder: Finder;
    public markdown: Markdown;

    constructor() {
        this.store = new Store();
        this.process = new Process(this.store);
        this.screen = new Screen(this.store);
        this.popupmenu = new Popupmenu(this.store);
        this.tabline = new Tabline(this.store);
        this.cmdline = new Cmdline(this.store);
        this.finder = new Finder(this.store, this.process.getClient());
        this.markdown = new Markdown(this.store, this.process.getClient());

        const configPath = path.join(process.env.HOME, '.config', 'elevim', 'config.toml');
        fs.readFile(configPath, { encoding: 'utf8' }, (_, data: Buffer) => {
            const config: IConfig = toml.parse(data.toString());
            remote.getCurrentWindow().setSize(config.width, config.height);
            this.store.emit('update-specified-font', config.font_size, config.font_family, config.line_height);
            this.process.attach();
        });
    }
}
