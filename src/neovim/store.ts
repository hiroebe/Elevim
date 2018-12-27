import { remote } from 'electron';
import { EventEmitter } from 'events';
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

export interface PopupmenuItem {
    word: string;
    kind: string;
    menu: string;
    info: string;
}

export default class NeovimStore {
    public font: Font;
    public size: Size;
    public cursor: Cursor;
    public mode: string;
    public modeIdx: number;
    public modeInfoList: ModeInfo[];
    public hlMap: Map<number, Highlight>;
    public grid: Cell[][];
    public lineHeight: number;
    private eventEmitter: EventEmitter;

    constructor() {
        this.updateFont(16, 'monospace');
        this.size = { rows: 0, cols: 0, width: 0, height: 0 };
        this.cursor = { row: 0, col: 0 };
        this.mode = '';
        this.modeIdx = 0;
        this.modeInfoList = [];
        this.hlMap = new Map();
        this.hlMap.set(0, this.newHighlight());
        this.grid = [];
        this.lineHeight = 1.2;
        this.eventEmitter = new EventEmitter();

        remote.getCurrentWindow().on('resize', this.resize.bind(this));

        this.prependListener('nvim-resize', this.onNvimResize.bind(this))
            .prependListener('update-specified-font', this.onUpdateSpecifiedFont.bind(this))
            .prependListener('update-font-size', this.onUpdateFontSize.bind(this))
            .prependListener('mode-info-set', this.onModeInfoSet.bind(this))
            .prependListener('mode-change', this.onModeChange.bind(this))
            .prependListener('default-colors-set', this.onDefaultColorsSet.bind(this))
            .prependListener('highlight-set', this.onHighlightSet.bind(this))
            .prependListener('set-chars', this.onSetChars.bind(this))
            .prependListener('clear', this.onClear.bind(this))
            .prependListener('cursor-goto', this.onCursorGoto.bind(this))
            .prependListener('scroll', this.onScroll.bind(this));
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

    public emit(event: 'resize-screen'): boolean;
    public emit(event: 'nvim-resize', rows: number, cols: number): boolean;
    public emit(event: 'update-specified-font', size: number, family: string, lineHeight: number): boolean;
    public emit(event: 'update-font-size', width: number, height: number): boolean;
    public emit(event: 'input', key: string): boolean;
    public emit(event: 'mode-info-set', modeInfoList: ModeInfo[]): boolean;
    public emit(event: 'mode-change', mode: string, modeIdx: number): boolean;
    public emit(event: 'busy-start'): boolean;
    public emit(event: 'busy-stop'): boolean;
    public emit(event: 'flush'): boolean;
    public emit(event: 'default-colors-set', fg: number, bg: number, sp: number): boolean;
    public emit(event: 'highlight-set', id: number, attrs: any): boolean;
    public emit(event: 'set-chars', row: number, colStart: number, cells: any[][]): boolean;
    public emit(event: 'clear'): boolean;
    public emit(event: 'cursor-goto', row: number, col: number): boolean;
    public emit(event: 'scroll', top: number, bot: number, left: number, right: number, rows: number): boolean;
    public emit(event: 'popupmenu-show', items: PopupmenuItem[], select: number, row: number, col: number): boolean;
    public emit(event: 'popupmenu-select', select: number): boolean;
    public emit(event: 'popupmenu-hide'): boolean;
    public emit(event: 'tabline-update', tabnr: number, tabs: string[]): boolean;
    public emit(event: 'cmdline-show', content: Cell[], pos: number, firstc: string, indent: number, level: number): boolean;
    public emit(event: 'cmdline-pos', pos: number, level: number): boolean;
    public emit(event: 'cmdline-hide'): boolean;
    public emit(event: 'wildmenu-show', items: string[]): boolean;
    public emit(event: 'wildmenu-select', selected: number): boolean;
    public emit(event: 'wildmenu-hide'): boolean;
    public emit(event: string, ...args: any[]): boolean {
        const ret = this.eventEmitter.emit(event, ...args);
        if (event === 'update-font-size') {
            this.resize();
        }
        return ret;
    }

    public on(event: 'resize-screen', fn: () => void): this;
    public on(event: 'nvim-resize', fn: (rows: number, cols: number) => void): this;
    public on(event: 'update-specified-font', fn: (size: number, family: string, lineHeight: number) => void): this;
    public on(event: 'update-font-size', fn: (width: number, height: number) => void): this;
    public on(event: 'input', fn: (key: string) => void): this;
    public on(event: 'mode-info-set', fn: (modeInfoList: ModeInfo[]) => void): this;
    public on(event: 'mode-change', fn: (mode: string, modeIdx: number) => void): this;
    public on(event: 'busy-start', fn: () => void): this;
    public on(event: 'busy-stop', fn: () => void): this;
    public on(event: 'flush', fn: () => void): this;
    public on(event: 'default-colors-set', fn: (fg: number, bg: number, sp: number) => void): this;
    public on(event: 'highlight-set', fn: (id: number, attrs: any) => void): this;
    public on(event: 'set-chars', fn: (row: number, colStart: number, cells: any[][]) => void): this;
    public on(event: 'clear', fn: () => void): this;
    public on(event: 'cursor-goto', fn: (row: number, col: number) => void): this;
    public on(event: 'scroll', fn: (top: number, bot: number, left: number, right: number, rows: number) => void): this;
    public on(event: 'popupmenu-show', fn: (items: PopupmenuItem[], select: number, row: number, col: number) => void): this;
    public on(event: 'popupmenu-select', fn: (selected: number) => void): this;
    public on(event: 'popupmenu-hide', fn: () => void): this;
    public on(event: 'tabline-update', fn: (tabnr: number, tabs: string[]) => void): this;
    public on(event: 'cmdline-show', fn: (content: Cell[], pos: number, firstc: string, indent: number, level: number) => void): this;
    public on(event: 'cmdline-pos', fn: (pos: number, level: number) => void): this;
    public on(event: 'cmdline-hide', fn: () => void): this;
    public on(event: 'wildmenu-show', fn: (items: string[]) => void): this;
    public on(event: 'wildmenu-select', fn: (selected: number) => void): this;
    public on(event: 'wildmenu-hide', fn: () => void): this;
    public on(event: string, fn: (...args: any[]) => void): this {
        this.eventEmitter.on(event, fn);
        return this;
    }

    private prependListener(event: 'resize-screen', fn: () => void): this;
    private prependListener(event: 'nvim-resize', fn: (rows: number, cols: number) => void): this;
    private prependListener(event: 'update-specified-font', fn: (size: number, family: string, lineHeight: number) => void): this;
    private prependListener(event: 'update-font-size', fn: (width: number, height: number) => void): this;
    private prependListener(event: 'input', fn: (key: string) => void): this;
    private prependListener(event: 'mode-info-set', fn: (modeInfoList: ModeInfo[]) => void): this;
    private prependListener(event: 'mode-change', fn: (mode: string, modeIdx: number) => void): this;
    private prependListener(event: 'busy-start', fn: () => void): this;
    private prependListener(event: 'busy-stop', fn: () => void): this;
    private prependListener(event: 'flush', fn: () => void): this;
    private prependListener(event: 'default-colors-set', fn: (fg: number, bg: number, sp: number) => void): this;
    private prependListener(event: 'highlight-set', fn: (id: number, attrs: any) => void): this;
    private prependListener(event: 'set-chars', fn: (row: number, colStart: number, cells: any[][]) => void): this;
    private prependListener(event: 'clear', fn: () => void): this;
    private prependListener(event: 'cursor-goto', fn: (row: number, col: number) => void): this;
    private prependListener(event: 'scroll', fn: (top: number, bot: number, left: number, right: number, rows: number) => void): this;
    private prependListener(event: string, fn: (...args: any[]) => void): this {
        this.eventEmitter.prependListener(event, fn);
        return this;
    }

    private onNvimResize(rows: number, cols: number) {
        this.updateGrid(rows, cols);
    }

    private onUpdateSpecifiedFont(fontSize: number, fontFamily: string, lineHeight: number) {
        this.updateFont(fontSize || this.font.size, fontFamily || this.font.family);
        this.lineHeight = lineHeight || this.lineHeight;
    }

    private onUpdateFontSize(width: number, height: number) {
        this.font.width = width;
        this.font.height = height;
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

    private onSetChars(row: number, colStart: number, cells: any[][]) {
        this.setChars(row, colStart, cells);
    }

    private onClear() {
        for (const line of this.grid) {
            for (let i = 0; i < line.length; i++) {
                line[i] = { text: '', hlID: 0 };
            }
        }
    }

    private onCursorGoto(row: number, col: number) {
        this.cursor = { row, col };
    }

    private onScroll(top: number, bot: number, left: number, right: number, rows: number) {
        this.scroll(top, bot, left, right, rows);
    }

    private updateFont(size: number, family: string) {
        this.font = {
            family,
            size,
            width: 0,
            height: 0,
        };
    }

    private updateGrid(rows: number, cols: number) {
        this.grid = [];
        for (let i = 0; i < rows; i++) {
            const line = [];
            for (let j = 0; j < cols; j++) {
                line.push({ text: '', hlID: 0 });
            }
            this.grid.push(line);
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

    private setChars(row: number, colStart: number, cells: any[][]) {
        let offset = 0;
        let hlID = 0;
        for (const cell of cells) {
            const text: string = cell[0];
            if (cell.length > 1) {
                hlID = cell[1];
            }
            const times: number = cell.length === 3 ? cell[2] : 1;
            for (let i = 0; i < times; i++) {
                this.grid[row][colStart + offset + i] = { text, hlID };
            }
            offset += times;
        }
    }

    private scroll(top: number, bot: number, left: number, right: number, rows: number) {
        if (rows > 0) {
            for (let i = top; i < bot - rows; i++) {
                this.scrollLine(i + rows, i, left, right);
            }
        } else {
            for (let i = bot - 1; i >= top - rows; i--) {
                this.scrollLine(i + rows, i, left, right);
            }
        }
    }

    private scrollLine(srcRow: number, dstRow: number, left: number, right: number) {
        const srcLine = this.grid[srcRow];
        const dstLine = this.grid[dstRow];
        for (let j = left; j < right; j++) {
            dstLine[j] = srcLine[j];
        }
    }

    private resize() {
        const rowsBefore = this.size.rows;
        const colsBefore = this.size.cols;

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
            this.emit('resize-screen');
        }
    }
}
