import * as cp from 'child_process';
import { remote } from 'electron';
import { attach, Neovim, Tabpage } from 'neovim';
import * as path from 'path';
import Store, { Cell, Inputter, PopupmenuItem } from './store';

export default class NeovimProcess {
    private client: Neovim;

    constructor(private readonly store: Store) {
        const rtp = path.join(__dirname, '..', '..', 'runtime');
        const argv: string[] = remote.process.argv.slice(2);
        argv.unshift(
            '--embed',
            '--cmd', 'let g:loaded_elevim=1',
            '--cmd', 'set rtp+=' + rtp,
        );
        const nvimProc = cp.spawn('nvim', argv, {});
        this.client = attach({ proc: nvimProc });

        this.client.on('notification', this.onNotified.bind(this));
        this.client.on('disconnect', this.onDisconnected.bind(this));
        this.client.subscribe('ElevimFinder');

        store.eventEmitter.on('input', (to: Inputter, key: string) => {
            if (to === Inputter.nvim) {
                this.client.input(key);
            }
        });
    }

    public attach() {
        const { rows, cols } = this.store.size;
        this.client.uiAttach(cols, rows, {
            ext_popupmenu: true,
            ext_tabline: true,
            ext_cmdline: true,
            // @ts-ignore
            ext_linegrid: true,
            ext_multigrid: true,
            // ext_messages: true,
        });
        this.store.eventEmitter.on('grid-size-changed', () => this.client.uiTryResize(this.store.size.cols, this.store.size.rows));
    }

    public getClient(): Neovim {
        return this.client;
    }

    private onNotified(method: string, events: any[]) {
        if (method === 'redraw') {
            for (const event of events) {
                const name: string = event[0];
                for (let i = 1; i < event.length; i++) {
                    const args: any[] = event[i];
                    this.redraw(name, args);
                }
            }
        } else if (method === 'ElevimFinder') {
            this.store.eventEmitter.emit('finder-show', events as string[]);
        }
    }

    private onDisconnected() {
        remote.getCurrentWindow().close();
    }

    private redraw(name: string, args: any[]) {
        switch (name) {
            // Global Events
            case 'set_title': {
                const title: string = args[0];
                remote.getCurrentWindow().setTitle(title);
                break;
            }
            case 'mode_info_set': {
                const modeInfo: any[] = args[1];
                const modeInfoList = modeInfo.map((info) => ({
                    name: info.name,
                    shortName: info.short_name,
                    cursorShape: info.cursor_shape || 'block',
                    cellPercentage: info.cell_percentage || 0,
                    attrID: info.attr_id || 0,
                }));
                this.store.eventEmitter.emit('mode-info-set', modeInfoList);
                break;
            }
            case 'mode_change': {
                const mode = args[0];
                const modeIdx = args[1];
                this.store.eventEmitter.emit('mode-change', mode, modeIdx);
                break;
            }
            case 'busy_start': {
                this.store.eventEmitter.emit('busy-start');
                break;
            }
            case 'busy_stop': {
                this.store.eventEmitter.emit('busy-stop');
                break;
            }
            case 'flush': {
                this.store.eventEmitter.emit('flush');
                break;
            }

            // Grid Events
            case 'grid_resize': {
                const grid: number = args[0];
                const cols: number = args[1];
                const rows: number = args[2];
                this.store.eventEmitter.emit('nvim-resize', grid, rows, cols);
                break;
            }
            case 'default_colors_set': {
                const fg: number = args[0];
                const bg: number = args[1];
                const sp: number = args[2];
                this.store.eventEmitter.emit('default-colors-set', fg, bg, sp);
                break;
            }
            case 'hl_attr_define': {
                const id: number = args[0];
                const attr = args[1];
                this.store.eventEmitter.emit('highlight-set', id, attr);
                break;
            }
            case 'grid_line': {
                const grid: number = args[0];
                const row: number = args[1];
                const colStart: number = args[2];
                const cells: any[][] = args[3];
                this.store.eventEmitter.emit('set-chars', grid, row, colStart, cells);
                break;
            }
            case 'grid_clear': {
                const grid: number = args[0];
                this.store.eventEmitter.emit('clear', grid);
                break;
            }
            case 'grid_destroy': {
                const grid: number = args[0];
                this.store.eventEmitter.emit('destroy', grid);
                break;
            }
            case 'grid_cursor_goto': {
                const grid: number = args[0];
                const row: number = args[1];
                const col: number = args[2];
                this.store.eventEmitter.emit('cursor-goto', grid, row, col);
                break;
            }
            case 'grid_scroll': {
                const grid: number = args[0];
                const top: number = args[1];
                const bot: number = args[2];
                const left: number = args[3];
                const right: number = args[4];
                const rows: number = args[5];
                // const cols: number = args[6];
                this.store.eventEmitter.emit('scroll', grid, top, bot, left, right, rows);
                break;
            }

            // Multigrid Events
            case 'win_pos': {
                const grid: number = args[0];
                const win: number = args[1];
                const startRow: number = args[2];
                const startCol: number = args[3];
                const width: number = args[4];
                const height: number = args[5];
                this.store.eventEmitter.emit('win-pos', grid, win, startRow, startCol, width, height);
                break;
            }
            case 'win_float_pos': {
                const grid: number = args[0];
                const win: number = args[1];
                const anchor: number = args[2];
                const anchorGrid: number = args[3];
                const anchorRow: number = args[4];
                const anchorCol: number = args[5];
                const focusable: boolean = args[6];
                this.store.eventEmitter.emit('win-float-pos', grid, win, anchor, anchorGrid, anchorRow, anchorCol, focusable);
                break;
            }
            case 'win_external_pos': {
                const grid: number = args[0];
                const win: number = args[1];
                this.store.eventEmitter.emit('win-external-pos', grid, win);
                break;
            }
            case 'win_hide': {
                const grid: number = args[0];
                this.store.eventEmitter.emit('win-hide', grid);
                break;
            }
            case 'win_scroll_over_start': {
                this.store.eventEmitter.emit('win-scroll-over-start');
                break;
            }
            case 'win_scroll_over_reset': {
                this.store.eventEmitter.emit('win-scroll-over-reset');
                break;
            }
            case 'win_close': {
                const grid: number = args[0];
                this.store.eventEmitter.emit('win-close', grid);
                break;
            }

            // Popupmenu Events
            case 'popupmenu_show': {
                const items: PopupmenuItem[] = args[0].map((item: any[]) => ({
                    word: item[0],
                    kind: item[1],
                    menu: item[2],
                    info: item[3],
                }));
                const selected: number = args[1];
                const row: number = args[2];
                const col: number = args[3];
                const grid: number = args[4];
                this.store.eventEmitter.emit('popupmenu-show', items, selected, row, col, grid);
                break;
            }
            case 'popupmenu_select': {
                const selected: number = args[0];
                this.store.eventEmitter.emit('popupmenu-select', selected);
                break;
            }
            case 'popupmenu_hide': {
                this.store.eventEmitter.emit('popupmenu-hide');
                break;
            }

            // Tabline Events
            case 'tabline_update': {
                const curtab: Tabpage = args[0];
                const tabs: string[] = args[1].map((dict: any) => dict.name);
                curtab.number.then((tabnr: number) => {
                    this.store.eventEmitter.emit('tabline-update', tabnr, tabs);
                });
                break;
            }

            // Cmdline Events
            case 'cmdline_show': {
                const content: Cell[] = args[0].map((item: any[]) => ({
                    hlID: item[0],
                    text: item[1],
                }));
                const pos: number = args[1];
                const firstc: string = args[2] !== '' ? args[2] : args[3];
                const indent: number = args[4];
                const level: number = args[5];
                this.store.eventEmitter.emit('cmdline-show', content, pos, firstc, indent, level);
                break;
            }
            case 'cmdline_pos': {
                const pos: number = args[0];
                const level: number = args[1];
                this.store.eventEmitter.emit('cmdline-pos', pos, level);
                break;
            }
            case 'cmdline_hide': {
                this.store.eventEmitter.emit('cmdline-hide');
                break;
            }

            // Message Events
            case 'msg_show': {
                // kind
                // content
                // replace_last
                console.log(name, args);
                break;
            }
            case 'msg_clear': {
                console.log(name, args);
                break;
            }
            case 'msg_showmode': {
                // content
                console.log(name, args);
                break;
            }
            case 'msg_showcmd': {
                // content
                console.log(name, args);
                break;
            }
            case 'msg_ruler': {
                // content
                console.log(name, args);
                break;
            }
            case 'msg_history_show': {
                // entries
                console.log(name, args);
                break;
            }
        }
    }
}
