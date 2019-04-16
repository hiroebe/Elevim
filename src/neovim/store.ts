import { remote } from 'electron';
import { EventEmitter } from 'events';
import StrictEventEmitter from 'strict-event-emitter-types';
import { colorToHexString } from '../utils';

export interface Font {
    family: string;
    size: number;
    width: number;
    height: number;
}

export interface Size {
    rows: number;
    cols: number;
    width: number;
    height: number;
}

export interface Cursor {
    gridIdx: number;
    row: number;
    col: number;
}

export interface ModeInfo {
    name: string;
    shortName: string;
    cursorShape: 'block' | 'horizontal' | 'vertical';
    cellPercentage: number;
    attrID: number;
}

export interface Highlight {
    fg: string;
    bg: string;
    sp: string;
    reverse: boolean;
    italic: boolean;
    bold: boolean;
    underline: boolean;
    undercurl: boolean;
}

export interface Cell {
    text: string;
    hlID: number;
}

export interface Grid {
    cells: Cell[][];
    winnr: number;
    startRow: number;
    startCol: number;
    width: number;
    height: number;
    display: 'normal' | 'float' | 'none';
}

export interface PopupmenuItem {
    word: string;
    kind: string;
    menu: string;
    info: string;
}

export enum Inputter {
    nvim,
    finder,
}

interface Events {
    /* tslint:disable:max-line-length */
    'check-resize': () => void;
    'screen-size-changed': () => void;
    'grid-size-changed': () => void;
    'nvim-resize': (gridIdx: number, rows: number, cols: number) => void;
    'update-specified-font': (size: number, family: string, lineHeight: number) => void;
    'update-font-size': (width: number, height: number) => void;
    'input': (to: Inputter, key: string) => void;
    'mode-info-set': (modeInfoList: ModeInfo[]) => void;
    'mode-change': (mode: string, modeIdx: number) => void;
    'busy-start': () => void;
    'busy-stop': () => void;
    'flush': () => void;
    'default-colors-set': (fg: number, bg: number, sp: number) => void;
    'highlight-set': (id: number, attrs: any) => void;
    'set-chars': (gridIdx: number, row: number, colStart: number, cells: any[][]) => void;
    'clear': (gridIdx: number) => void;
    'destroy': (gridIdx: number) => void;
    'cursor-goto': (gridIdx: number, row: number, col: number) => void;
    'scroll': (gridIdx: number, top: number, bot: number, left: number, right: number, rows: number) => void;
    'win-pos': (gridIdx: number, win: number, startRow: number, startCol: number, width: number, height: number) => void;
    'win-float-pos': (gridIdx: number, win: number, anchor: string, anchorGrid: number, anchorRow: number, anchorCol: number, focusable: boolean) => void;
    'win-external-pos': (gridIdx: number, win: number) => void;
    'win-hide': (gridIdx: number) => void;
    'win-scroll-over-start': () => void;
    'win-scroll-over-reset': () => void;
    'win-close': (gridIdx: number) => void;
    'popupmenu-show': (items: PopupmenuItem[], select: number, row: number, col: number, gridIdx: number) => void;
    'popupmenu-select': (select: number) => void;
    'popupmenu-hide': () => void;
    'tabline-update': (tabnr: number, tabs: string[]) => void;
    'cmdline-show': (content: Cell[], pos: number, firstc: string, indent: number, level: number) => void;
    'cmdline-pos': (pos: number, level: number) => void;
    'cmdline-hide': () => void;
    'wildmenu-show': (items: string[], header?: string) => void;
    'wildmenu-select': (selected: number) => void;
    'wildmenu-hide': () => void;
    'finder-show': (args: string[]) => void;
    'finder-hide': () => void;
    /* tslint:enable:max-line-length */
}

export default class NeovimStore {
    public font: Font;
    public size: Size;
    public cursor: Cursor;
    public mode: string;
    public modeIdx: number;
    public modeInfoList: ModeInfo[];
    public hlMap: Map<number, Highlight>;
    public grids: Map<number, Grid>;
    public winScrollingOver: boolean;
    public lineHeight: number;
    public eventEmitter: StrictEventEmitter<EventEmitter, Events>;
    private inputDirection: Inputter;

    constructor() {
        this.updateFont(16, 'monospace');
        this.size = { rows: 0, cols: 0, width: 0, height: 0 };
        this.cursor = { gridIdx: 0, row: 0, col: 0 };
        this.mode = '';
        this.modeIdx = 0;
        this.modeInfoList = [];
        this.hlMap = new Map();
        this.hlMap.set(0, this.newHighlight());
        this.grids = new Map();
        this.winScrollingOver = false;
        this.lineHeight = 1.2;
        this.eventEmitter = new EventEmitter();
        this.inputDirection = Inputter.nvim;

        remote.getCurrentWindow().on('resize', this.resize.bind(this));


        this.eventEmitter
            .prependListener('check-resize', this.resize.bind(this))
            .prependListener('nvim-resize', this.onNvimResize.bind(this))
            .prependListener('update-specified-font', this.onUpdateSpecifiedFont.bind(this))
            .prependListener('update-font-size', this.onUpdateFontSize.bind(this))
            .prependListener('mode-info-set', this.onModeInfoSet.bind(this))
            .prependListener('mode-change', this.onModeChange.bind(this))
            .prependListener('default-colors-set', this.onDefaultColorsSet.bind(this))
            .prependListener('highlight-set', this.onHighlightSet.bind(this))
            .prependListener('set-chars', this.onSetChars.bind(this))
            .prependListener('clear', this.onClear.bind(this))
            .prependListener('destroy', this.onDestroy.bind(this))
            .prependListener('cursor-goto', this.onCursorGoto.bind(this))
            .prependListener('scroll', this.onScroll.bind(this))
            .prependListener('win-pos', this.onWinPos.bind(this))
            .prependListener('win-float-pos', this.onWinFloatPos.bind(this))
            // .prependListener('win-external-pos', this.onWinExternalPos.bind(this))
            .prependListener('win-hide', this.onWinHide.bind(this))
            .prependListener('win-scroll-over-start', () => this.winScrollingOver = true)
            .prependListener('win-scroll-over-reset', () => this.winScrollingOver = false)
            .prependListener('win-close', this.onWinClose.bind(this))
            .prependListener('finder-show', () => this.inputDirection = Inputter.finder)
            .prependListener('finder-hide', () => this.inputDirection = Inputter.nvim);
    }

    public getFontStyle(hl: Highlight): string {
        const ratio = window.devicePixelRatio;
        const { size, family } = this.font;

        let attrs = '';
        if (hl.bold) {
            attrs += 'bold ';
        }
        if (hl.italic) {
            attrs += 'italic ';
        }
        return attrs + size * ratio + 'px ' + family;
    }

    public inputKey(key: string) {
        this.eventEmitter.emit('input', this.inputDirection, key);
    }

    private onNvimResize(gridIdx: number, rows: number, cols: number) {
        this.resizeGrid(gridIdx, rows, cols);
    }

    private onUpdateSpecifiedFont(fontSize: number, fontFamily: string, lineHeight: number) {
        this.updateFont(fontSize || this.font.size, fontFamily || this.font.family);
        this.lineHeight = lineHeight || this.lineHeight;
    }

    private onUpdateFontSize(width: number, height: number) {
        this.font.width = width;
        this.font.height = height;
        this.eventEmitter.emit('check-resize');
    }

    private onModeInfoSet(modeInfoList: ModeInfo[]) {
        this.modeInfoList = modeInfoList;
    }

    private onModeChange(mode: string, modeIdx: number) {
        this.mode = mode;
        this.modeIdx = modeIdx;
    }

    private onDefaultColorsSet(fg: number, bg: number, sp: number) {
        const hl = this.newHighlight(fg, bg, sp);
        this.hlMap.set(0, hl);
    }

    private onHighlightSet(id: number, attr: any) {
        const hl = this.newHighlight(
            attr.foreground,
            attr.background,
            attr.special,
            attr.reverse,
            attr.italic,
            attr.bold,
            attr.underline,
            attr.undercurl,
        );
        this.hlMap.set(id, hl);
    }

    private onSetChars(gridIdx: number, row: number, colStart: number, cells: any[][]) {
        this.setChars(gridIdx, row, colStart, cells);
    }

    private onClear(gridIdx: number) {
        const cells = this.grids.get(gridIdx).cells;
        for (const line of cells) {
            for (let i = 0; i < line.length; i++) {
                line[i] = { text: ' ', hlID: 0 };
            }
        }
    }

    private onDestroy(gridIdx: number) {
        this.grids.delete(gridIdx);
    }

    private onCursorGoto(gridIdx: number, row: number, col: number) {
        this.cursor = { gridIdx, row, col };
    }

    private onScroll(gridIdx: number, top: number, bot: number, left: number, right: number, rows: number) {
        this.scroll(gridIdx, top, bot, left, right, rows);
    }

    private onWinPos(gridIdx: number, win: number, startRow: number, startCol: number, width: number, height: number) {
        const grid = this.grids.get(gridIdx);
        grid.winnr = win;
        grid.startRow = startRow;
        grid.startCol = startCol;
        grid.width = width;
        grid.height = height;
        grid.display = 'normal';
    }

    // tslint:disable-next-line:max-line-length
    private onWinFloatPos(gridIdx: number, win: number, anchor: string, anchorGridIdx: number, anchorRow: number, anchorCol: number, focusable: boolean) {
        const grid = this.grids.get(gridIdx);
        const anchorGrid = this.grids.get(anchorGridIdx);
        grid.winnr = win;
        switch (anchor) {
            case 'NW':
                grid.startRow = anchorGrid.startRow + anchorRow;
                grid.startCol = anchorGrid.startCol + anchorCol;
                break;
            case 'NE':
                grid.startRow = anchorGrid.startRow + anchorRow;
                grid.startCol = anchorGrid.startCol + anchorCol + grid.width;
                break;
            case 'SW':
                grid.startRow = anchorGrid.startRow + anchorRow + grid.height;
                grid.startCol = anchorGrid.startCol + anchorCol;
                break;
            case 'SE':
                grid.startRow = anchorGrid.startRow + anchorRow + grid.height;
                grid.startCol = anchorGrid.startCol + anchorCol + grid.width;
                break;
        }
        grid.display = 'float';
    }

    private onWinHide(gridIdx: number) {
        const grid = this.grids.get(gridIdx);
        grid.display = 'none';
    }

    private onWinClose(gridIdx: number) {
        const grid = this.grids.get(gridIdx);
        grid.winnr = -1;
        grid.display = 'none';
    }

    private updateFont(size: number, family: string) {
        this.font = {
            family,
            size,
            width: 0,
            height: 0,
        };
    }

    private resizeGrid(gridIdx: number, rows: number, cols: number) {
        const cells = [];
        for (let i = 0; i < rows; i++) {
            const line = [];
            for (let j = 0; j < cols; j++) {
                line.push({ text: ' ', hlID: 0 });
            }
            cells.push(line);
        }
        if (this.grids.has(gridIdx)) {
            const grid = this.grids.get(gridIdx);
            const rowsToCopy = Math.min(cells.length, grid.cells.length);
            for (let i = 0; i < rowsToCopy; i++) {
                const colsToCopy = Math.min(cells[i].length, grid.cells[i].length);
                for (let j = 0; j < colsToCopy; j++) {
                    cells[i][j] = grid.cells[i][j];
                }
            }
            grid.cells = cells;
            grid.width = cols;
            grid.height = rows;
        } else {
            const grid: Grid = {
                cells,
                winnr: -1,
                startRow: 0,
                startCol: 0,
                width: cols,
                height: rows,
                display: 'normal',
            };
            this.grids.set(gridIdx, grid);
        }
    }

    private newHighlight(
        fg: number = -1,
        bg: number = -1,
        sp: number = -1,
        reverse: boolean = false,
        italic: boolean = false,
        bold: boolean = false,
        underline: boolean = false,
        undercurl: boolean = false,
    ): Highlight {
        const fgString = fg === -1 ? null : colorToHexString(fg);
        const bgString = bg === -1 ? null : colorToHexString(bg);
        const spString = sp === -1 ? null : colorToHexString(sp);
        return {
            fg: fgString,
            bg: bgString,
            sp: spString,
            reverse,
            italic,
            bold,
            underline,
            undercurl,
        };
    }

    private setChars(gridIdx: number, row: number, colStart: number, cells: any[][]) {
        const grid = this.grids.get(gridIdx);
        let offset = 0;
        let hlID = 0;
        for (const cell of cells) {
            const text: string = cell[0];
            if (cell.length > 1) {
                hlID = cell[1];
            }
            const times: number = cell.length === 3 ? cell[2] : 1;
            for (let i = 0; i < times; i++) {
                grid.cells[row][colStart + offset + i] = { text, hlID };
            }
            offset += times;
        }
    }

    private scroll(gridIdx: number, top: number, bot: number, left: number, right: number, rows: number) {
        const grid = this.grids.get(gridIdx);
        const cells = grid.cells;
        if (rows > 0) {
            for (let i = top; i < bot - rows; i++) {
                const srcLine = cells[i + rows];
                const dstLine = cells[i];
                for (let j = left; j < right; j++) {
                    dstLine[j] = srcLine[j];
                }
            }
        } else {
            for (let i = bot - 1; i >= top - rows; i--) {
                const srcLine = cells[i + rows];
                const dstLine = cells[i];
                for (let j = left; j < right; j++) {
                    dstLine[j] = srcLine[j];
                }
            }
        }
    }

    private resize() {
        const rowsBefore = this.size.rows;
        const colsBefore = this.size.cols;
        const widthBefore = this.size.width;
        const heightBefore = this.size.height;

        const ratio = window.devicePixelRatio;
        const container = document.getElementById('container') as HTMLDivElement;
        const width = container.clientWidth * ratio;
        const height = container.clientHeight * ratio;

        const rows = Math.floor(height / this.font.height);
        const cols = Math.floor(width / this.font.width);
        this.size = {
            rows,
            cols,
            width,
            height,
        };
        if (rows !== rowsBefore || cols !== colsBefore) {
            this.eventEmitter.emit('grid-size-changed');
        }
        if (width !== widthBefore || height !== heightBefore) {
            this.eventEmitter.emit('screen-size-changed');
        }
    }
}
