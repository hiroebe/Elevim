import wcwidth = require('wcwidth');
import Cursor from './cursor';
import Input from './input';
import { IHighlight } from './store';
import Store from './store';

interface IRect {
    top: number;
    bot: number;
    left: number;
    right: number;
}

export default class NeovimScreen {
    private cursor: Cursor;
    private input: Input;
    private canvas: HTMLCanvasElement;
    private hiddenCanvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private hiddenCtx: CanvasRenderingContext2D;
    private modifiedRect: IRect;
    private redrawTimer: number;
    private redrawTimeoutFunc: () => void;
    private lastScrollTime: number;

    constructor(private readonly store: Store) {
        this.cursor = new Cursor(store);
        this.input = new Input(store);
        this.canvas = document.getElementById('screen') as HTMLCanvasElement;
        this.hiddenCanvas = document.getElementById('hidden-screen') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.hiddenCtx = this.hiddenCanvas.getContext('2d');
        this.modifiedRect = { top: -1, bot: -1, left: -1, right: -1 };
        this.redrawTimer = null;
        this.redrawTimeoutFunc = () => {
            this.redrawTimer = null;
            this.redrawAll();
            this.flush();
        };
        this.lastScrollTime = 0;

        this.canvas.addEventListener('click', () => this.input.focus());

        store.onResizeScreen(this.resize.bind(this));
        store.onUpdateSpecifiedFont(this.measureFont.bind(this));
        store.onDefaultColorsSet(this.clear.bind(this));
        store.onSetChars(this.draw.bind(this));
        store.onClear(this.clear.bind(this));
        store.onScroll(this.scheduleScroll.bind(this));
        store.onFlush(this.flush.bind(this));
    }

    private updateModifiedRect(newTop: number, newBot: number, newLeft: number, newRight: number) {
        const { top, bot, left, right } = this.modifiedRect;
        if (top === -1 || newTop < top) {
            this.modifiedRect.top = newTop;
        }
        if (bot === -1 || newBot > bot) {
            this.modifiedRect.bot = newBot;
        }
        if (left === -1 || newLeft < left) {
            this.modifiedRect.left = newLeft;
        }
        if (right === -1 || newRight > right) {
            this.modifiedRect.right = newRight;
        }
    }

    private resetRedrawTimer() {
        if (this.redrawTimer !== null) {
            window.clearTimeout(this.redrawTimer);
        }
        this.redrawTimer = window.setTimeout(this.redrawTimeoutFunc, 1);
    }

    private clear() {
        const { width, height } = this.store.size;
        const defaultHl = this.store.hlMap.get(0);
        this.hiddenCtx.fillStyle = defaultHl.bg;
        this.hiddenCtx.fillRect(0, 0, width, height);

        this.modifiedRect = { top: 0, bot: this.store.size.rows, left: 0, right: this.store.size.cols };
    }

    private draw(row: number, colStart: number, cells: any[][]) {
        if (this.redrawTimer !== null) {
            this.resetRedrawTimer();
            return;
        }
        let offset = 0;
        let hlID = 0;
        let text = '';
        for (const cell of cells) {
            if (cell.length > 1) {
                if (text !== '') {
                    this.drawChars(text, hlID, row, colStart + offset);
                    offset += wcwidth(text);
                    text = '';
                }
                hlID = cell[1];
            }
            const c: string = cell[0];
            const times: number = cell.length === 3 ? cell[2] : 1;
            text += c.repeat(times);
        }
        this.drawChars(text, hlID, row, colStart + offset);
        offset += wcwidth(text);

        this.updateModifiedRect(row, row + 1, colStart, colStart + offset);
    }

    private scheduleScroll(top: number, bot: number, left: number, right: number, rows: number) {
        if (this.redrawTimer !== null) {
            this.resetRedrawTimer();
            return;
        }
        const last = this.lastScrollTime;
        this.lastScrollTime = performance.now();
        if (this.lastScrollTime - last < 1) {
            this.resetRedrawTimer();
            return;
        }
        this.scroll(top, bot, left, right, rows);
    }

    private scroll(top: number, bot: number, left: number, right: number, rows: number) {
        const { width, height } = this.store.font;
        const x = left * width;
        const y = top * height;
        const w = (right - left) * width;
        const h = (bot - top) * height;
        const dy = rows * height;

        this.hiddenCtx.save();
        this.hiddenCtx.beginPath();
        this.hiddenCtx.rect(x, y, w, h);
        this.hiddenCtx.clip();
        this.hiddenCtx.drawImage(this.hiddenCanvas, 0, -dy);
        this.hiddenCtx.restore();

        this.updateModifiedRect(top, bot, left, right);
    }

    private flush() {
        if (this.redrawTimer !== null) {
            this.resetRedrawTimer();
            return;
        }
        let { top, bot, left, right } = this.modifiedRect;

        if (top === 0 && bot === this.store.size.rows && left === 0 && right === this.store.size.cols) {
            this.ctx.drawImage(this.hiddenCanvas, 0, 0);
            this.modifiedRect = { top: -1, bot: -1, left: -1, right: -1 };
            return;
        }

        if (top === -1) {
            top = 0;
        }
        if (bot === -1) {
            bot = this.store.size.rows;
        }
        if (left === -1) {
            left = 0;
        }
        if (right === -1) {
            right = this.store.size.cols;
        }

        const { width, height } = this.store.font;
        const x = left * width;
        const y = top * height;
        const w = (right - left) * width;
        const h = (bot - top) * height;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(x, y, w, h);
        this.ctx.clip();
        this.ctx.drawImage(this.hiddenCanvas, 0, 0);
        this.ctx.restore();

        this.modifiedRect = { top: -1, bot: -1, left: -1, right: -1 };
    }

    private drawChars(text: string, hlID: number, row: number, col: number) {
        const hl = this.store.hlMap.get(hlID);
        // const [fg, bg] = this.store.hlToHexString(hl);
        const defaultHl = this.store.hlMap.get(0);
        const fg = hl.fg || defaultHl.fg;
        const bg = hl.bg || defaultHl.bg;

        const { width, height } = this.store.font;
        const x = col * width;
        const y = row * height;
        const margin = (this.store.lineHeight - 1.2) / 2 * height;

        const rectWidth = wcwidth(text) * width;
        this.hiddenCtx.fillStyle = bg;
        this.hiddenCtx.fillRect(x, y, rectWidth, height);

        this.hiddenCtx.font = this.store.getFontStyle(hl);
        this.hiddenCtx.fillStyle = fg;
        this.hiddenCtx.fillText(text, x, y + margin);

        if (hl.underline || hl.undercurl) {
            const ratio = window.devicePixelRatio;
            const offsetY = height - 3 * ratio;
            this.hiddenCtx.lineWidth = ratio;
            this.hiddenCtx.strokeStyle = hl.sp || defaultHl.sp || fg;
            this.hiddenCtx.beginPath();
            this.hiddenCtx.moveTo(x, y + offsetY);
            this.hiddenCtx.lineTo(x + rectWidth, y + offsetY);
            this.hiddenCtx.stroke();
        }
    }

    private redrawAll() {
        const defaultHl = this.store.hlMap.get(0);
        this.hiddenCtx.fillStyle = defaultHl.bg;
        this.hiddenCtx.fillRect(0, 0, this.store.size.width, this.store.size.height);

        for (let i = 0; i < this.store.size.rows; i++) {
            for (let j = 0; j < this.store.size.cols; j++) {
                const cell = this.store.grid[i][j];
                this.drawChars(cell.text, cell.hlID, i, j);
            }
        }
        this.modifiedRect = { top: 0, bot: this.store.size.rows, left: 0, right: this.store.size.cols };
    }

    private resize() {
        const ratio = window.devicePixelRatio;
        const { width, height } = this.store.size;

        for (const elem of [this.canvas, this.hiddenCanvas]) {
            elem.width = width;
            elem.height = height;
            elem.style.width = width / ratio + 'px';
            elem.style.height = height / ratio + 'px';
        }

        this.hiddenCtx.textBaseline = 'top';
    }

    private measureFont() {
        const ratio = window.devicePixelRatio;
        const { size, family } = this.store.font;
        this.hiddenCtx.font = size * ratio + 'px ' + family;
        const width = this.hiddenCtx.measureText('A').width;
        const height = Math.floor(width * 2 * this.store.lineHeight);
        this.store.emitUpdateFontSize(width, height);
    }
}
