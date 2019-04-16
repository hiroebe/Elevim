import wcwidth = require('wcwidth');
import Cursor from './cursor';
import Input from './input';
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
    private flushTimer: number;

    constructor(private readonly store: Store) {
        this.cursor = new Cursor(store);
        this.input = new Input(store);
        this.canvas = document.getElementById('screen') as HTMLCanvasElement;
        this.hiddenCanvas = document.getElementById('hidden-screen') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.hiddenCtx = this.hiddenCanvas.getContext('2d');

        this.canvas.addEventListener('click', () => this.input.focus());

        store.eventEmitter
            .on('grid-size-changed', this.resize.bind(this))
            .on('update-specified-font', this.measureFont.bind(this))
            .on('default-colors-set', this.clear.bind(this))
            .on('clear', this.clear.bind(this))
            .on('scroll', this.scroll.bind(this))
            .on('flush', this.scheduleFlush.bind(this));
    }

    private clear() {
        const { width, height } = this.store.size;
        const defaultHl = this.store.hlMap.get(0);
        this.hiddenCtx.fillStyle = defaultHl.bg;
        this.hiddenCtx.fillRect(0, 0, width, height);
    }

    private scroll(gridIdx: number, top: number, bot: number, left: number, right: number, rows: number) {
        const grid = this.store.grids.get(gridIdx);
        top += grid.startRow;
        bot += grid.startRow;
        left += grid.startCol;
        right += grid.startCol;
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
    }

    private scheduleFlush() {
        if (this.flushTimer !== null) {
            window.clearTimeout(this.flushTimer);
        }
        this.flushTimer = window.setTimeout(this.flush.bind(this), 10);
    }

    private flush() {
        this.redrawAll();
        this.ctx.drawImage(this.hiddenCanvas, 0, 0);
    }

    private drawChars(gridIdx: number, text: string, hlID: number, row: number, col: number) {
        const grid = this.store.grids.get(gridIdx);
        const hl = this.store.hlMap.get(hlID);
        const defaultHl = this.store.hlMap.get(0);
        let fg = hl.fg || defaultHl.fg;
        let bg = hl.bg || defaultHl.bg;
        if (hl.reverse) {
            [fg, bg] = [bg, fg];
        }

        const { width, height } = this.store.font;
        const x = (col + grid.startCol) * width;
        const y = (row + grid.startRow) * height;
        const margin = (this.store.lineHeight - 1.2) / 2 * height;

        const rectWidth = wcwidth(text) * width;
        this.hiddenCtx.fillStyle = bg;
        this.hiddenCtx.fillRect(x, y, rectWidth, height);

        this.hiddenCtx.font = this.store.getFontStyle(hl);
        this.hiddenCtx.fillStyle = fg;
        this.hiddenCtx.fillText(text, x, y + margin, rectWidth);

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

        if (col <= 0) {
            return;
        }
        const leftCell = grid.cells[row][col - 1];
        const leftCellHl = this.store.hlMap.get(leftCell.hlID);
        if (leftCellHl.italic) {
            this.drawChars(gridIdx, leftCell.text, leftCell.hlID, row, col - 1);
        }
    }

    private redrawAll() {
        const defaultHl = this.store.hlMap.get(0);
        this.hiddenCtx.fillStyle = defaultHl.bg;
        this.hiddenCtx.fillRect(0, 0, this.store.size.width, this.store.size.height);

        if (!this.store.winScrollingOver) {
            this.drawGrid(1);
        }
        this.drawFGGrids('normal');
        this.drawFGGrids('float');
        if (this.store.winScrollingOver) {
            this.drawGrid(1);
        }
    }

    private drawFGGrids(display: 'normal' | 'float') {
        for (const gridIdx of this.store.grids.keys()) {
            if (gridIdx === 1) {
                continue;
            }
            if (this.store.grids.get(gridIdx).display === display) {
                this.drawGrid(gridIdx);
            }
        }
    }

    private drawGrid(gridIdx: number) {
        const grid = this.store.grids.get(gridIdx);
        for (let i = 0; i < grid.cells.length; i++) {
            let text = grid.cells[i][0].text;
            let hlID = grid.cells[i][0].hlID;
            for (let j = 1; j < grid.cells[i].length; j++) {
                const cell = grid.cells[i][j];
                if (cell.hlID === hlID) {
                    text += cell.text;
                } else {
                    this.drawChars(gridIdx, text, hlID, i, j - wcwidth(text));
                    text = cell.text;
                    hlID = cell.hlID;
                }
            }
            this.drawChars(gridIdx, text, hlID, i, grid.width - wcwidth(text));
        }
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
        this.store.eventEmitter.emit('update-font-size', width, height);
    }
}
