import { remote } from 'electron';
import { EventEmitter } from 'events';
import { colorToHexString } from '../utils';

interface IFont {
    family: string;
    size: number;
    width: number;
    height: number;
}

interface ISize {
    rows: number;
    cols: number;
    width: number;
    height: number;
}

interface ICursor {
    row: number;
    col: number;
}

interface IModeInfo {
    name: string;
    shortName: string;
    cursorShape: 'block' | 'horizontal' | 'vertical';
    cellPercentage: number;
    attrID: number;
}

export interface IHighlight {
    fg: string;
    bg: string;
    sp: string;
    reverse: boolean;
    italic: boolean;
    bold: boolean;
    underline: boolean;
    undercurl: boolean;
}

interface ICell {
    text: string;
    hlID: number;
}

export default class NeovimStore extends EventEmitter {
    public font: IFont;
    public size: ISize;
    public cursor: ICursor;
    public mode: string;
    public modeIdx: number;
    public modeInfoList: IModeInfo[];
    public hlMap: Map<number, IHighlight>;
    public grid: ICell[][];
    public lineHeight: number;

    constructor() {
        super();
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

        remote.getCurrentWindow().on('resize', this.resize.bind(this));
    }

    public getFontStyle(hl: IHighlight): string {
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

    public emitResizeScreen() {
        this.emit('resize-screen');
    }

    public onResizeScreen(fn: () => void) {
        this.on('resize-screen', fn);
    }

    public emitNvimResize(rows: number, cols: number) {
        this.updateGrid(rows, cols);
        this.emit('nvim-resize', rows, cols);
    }

    public onNvimResize(fn: (rows: number, cols: number) => void) {
        this.on('nvim-resize', fn);
    }

    public emitUpdateSpecifiedFont(fontSize: number, fontFamily: string, lineHeight: number) {
        this.updateFont(fontSize || this.font.size, fontFamily || this.font.family);
        this.lineHeight = lineHeight || this.lineHeight;
        this.emit('update-font-string');
    }

    public onUpdateSpecifiedFont(fn: () => void) {
        this.on('update-font-string', fn);
    }

    public emitUpdateFontSize(width: number, height: number) {
        this.font.width = width;
        this.font.height = height;
        this.emit('update-font-size');

        this.resize();
    }

    public onUpdateFontSize(fn: () => void) {
        this.on('update-font-size', fn);
    }

    public emitInput(key: string) {
        this.emit('input', key);
    }

    public onInput(fn: (key: string) => void) {
        this.on('input', fn);
    }

    public emitModeInfoSet(modeInfoList: IModeInfo[]) {
        this.modeInfoList = modeInfoList;
        this.emit('mode-info-set');
    }

    public onModeInfoSet(fn: () => void) {
        this.on('mode-info-set', fn);
    }

    public emitModeChange(mode: string, modeIdx: number) {
        this.mode = mode;
        this.modeIdx = modeIdx;
        this.emit('mode-change');
    }

    public onModeChange(fn: () => void) {
        this.on('mode-change', fn);
    }

    public emitBusyStart() {
        this.emit('busy-start');
    }

    public onBusyStart(fn: () => void) {
        this.on('busy-start', fn);
    }

    public emitBusyStop() {
        this.emit('busy-stop');
    }

    public onBusyStop(fn: () => void) {
        this.on('busy-stop', fn);
    }

    public emitFlush() {
        this.emit('flush');
    }

    public onFlush(fn: () => void) {
        this.on('flush', fn);
    }

    public emitDefaultColorsSet(fg: number, bg: number, sp: number) {
        const hl = this.newHighlight(fg, bg, sp);
        this.hlMap.set(0, hl);
        this.emit('default-colors-set');
    }

    public onDefaultColorsSet(fn: () => void) {
        this.on('default-colors-set', fn);
    }

    public emitHighlightSet(id: number, attr: any) {
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
        this.emit('highlight-set');
    }

    public onHighlightSet(fn: () => void) {
        this.on('highlight-set', fn);
    }

    public emitSetChars(row: number, colStart: number, cells: any[][]) {
        this.setChars(row, colStart, cells);
        this.emit('set-chars', row, colStart, cells);
    }

    public onSetChars(fn: (row: number, colStart: number, cells: any[][]) => void) {
        this.on('set-chars', fn);
    }

    public emitClear() {
        for (const line of this.grid) {
            for (let i = 0; i < line.length; i++) {
                line[i] = { text: '', hlID: 0 };
            }
        }
        this.emit('clear');
    }

    public onClear(fn: () => void) {
        this.on('clear', fn);
    }

    public emitCursorGoto(row: number, col: number) {
        this.cursor = { row, col };
        this.emit('cursor-goto');
    }

    public onCursorGoto(fn: () => void) {
        this.on('cursor-goto', fn);
    }

    public emitScroll(top: number, bot: number, left: number, right: number, rows: number) {
        this.scroll(top, bot, left, right, rows);
        this.emit('scroll', top, bot, left, right, rows);
    }

    public onScroll(fn: (top: number, bot: number, left: number, right: number, rows: number) => void) {
        this.on('scroll', fn);
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
    ): IHighlight {
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
            this.emitResizeScreen();
        }
    }
}
