import * as cp from 'child_process';
import { remote } from 'electron';
import { attach, Neovim } from 'neovim';
import Store, { PopupmenuItem } from './store';

export default class NeovimProcess {
    private nvim: Neovim;

    constructor(private readonly store: Store) {
        const nvimProc = cp.spawn('nvim', ['--embed'], {});
        this.nvim = attach({ proc: nvimProc });

        this.nvim.on('notification', this.onNotified.bind(this));
        this.nvim.on('disconnect', this.onDisconnected.bind(this));

        store.onInput((key: string) => this.nvim.input(key));
    }

    public attach() {
        const { rows, cols } = this.store.size;
        this.nvim.uiAttach(cols, rows, {
            // @ts-ignore
            ext_linegrid: true,
            ext_popupmenu: true,
        });
        this.store.onResizeScreen(() => this.nvim.uiTryResize(this.store.size.cols, this.store.size.rows));
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
        }
    }

    private onDisconnected() {
        remote.getCurrentWindow().close();
    }

    private redraw(name: string, args: any[]) {
        switch (name) {
            case 'set_title': {
                const title: string = args[0];
                remote.getCurrentWindow().setTitle(title);
                break;
            }
            case 'mode_info_set': {
                const modeInfo: any[] = args[1];
                const modeInfoList = modeInfo.map((info) => {
                    return {
                        name: info.name,
                        shortName: info.short_name,
                        cursorShape: info.cursor_shape || 'block',
                        cellPercentage: info.cell_percentage || 0,
                        attrID: info.attr_id || 0,
                    };
                });
                this.store.emitModeInfoSet(modeInfoList);
                break;
            }
            case 'mode_change': {
                const mode = args[0];
                const modeIdx = args[1];
                this.store.emitModeChange(mode, modeIdx);
                break;
            }
            case 'busy_start': {
                this.store.emitBusyStart();
                break;
            }
            case 'busy_stop': {
                this.store.emitBusyStop();
                break;
            }
            case 'flush': {
                this.store.emitFlush();
                break;
            }

            case 'grid_resize': {
                // const grid: number = args[0];
                const cols: number = args[1];
                const rows: number = args[2];
                this.store.emitNvimResize(rows, cols);
                break;
            }
            case 'default_colors_set': {
                const fg: number = args[0];
                const bg: number = args[1];
                const sp: number = args[2];
                this.store.emitDefaultColorsSet(fg, bg, sp);
                break;
            }
            case 'hl_attr_define': {
                const id: number = args[0];
                const attr = args[1];
                this.store.emitHighlightSet(id, attr);
                break;
            }
            case 'grid_line': {
                // const grid: number = args[0];
                const row: number = args[1];
                const colStart: number = args[2];
                const cells: any[][] = args[3];
                this.store.emitSetChars(row, colStart, cells);
                break;
            }
            case 'grid_clear': {
                this.store.emitClear();
                break;
            }
            case 'grid_cursor_goto': {
                // const grid: number = args[0];
                const row: number = args[1];
                const col: number = args[2];
                this.store.emitCursorGoto(row, col);
                break;
            }
            case 'grid_scroll': {
                // const grid: number = args[0];
                const top: number = args[1];
                const bot: number = args[2];
                const left: number = args[3];
                const right: number = args[4];
                const rows: number = args[5];
                // const cols: number = args[6];
                this.store.emitScroll(top, bot, left, right, rows);
                break;
            }

            case 'popupmenu_show': {
                const items: PopupmenuItem[] = args[0].map((item: any[]) => {
                    return {
                        word: item[0],
                        kind: item[1],
                        menu: item[2],
                        info: item[3],
                    };
                });
                const selected: number = args[1];
                const row: number = args[2];
                const col: number = args[3];
                this.store.emitPopupmenuShow(items, selected, row, col);
                break;
            }
            case 'popupmenu_select': {
                const selected: number = args[0];
                this.store.emitPopupmenuSelect(selected);
                break;
            }
            case 'popupmenu_hide': {
                this.store.emitPopupmenuHide();
                break;
            }
        }
    }
}
