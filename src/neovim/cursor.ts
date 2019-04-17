import wcwidth = require('wcwidth');
import Store from './store';
import { colorToCSS } from '../utils';

export default class Cursor {
    private element: HTMLSpanElement;
    private renderTimer: number;
    private renderTimeoutFunc: () => void;

    constructor(private readonly store: Store) {
        this.element = document.getElementById('cursor') as HTMLSpanElement;
        this.renderTimer = null;
        this.renderTimeoutFunc = () => {
            this.render();
            this.renderTimer = null;
        };

        store.eventEmitter
            .on('flush', this.scheduleRender.bind(this))
            .on('busy-start', this.hide.bind(this))
            .on('busy-stop', this.show.bind(this));
    }

    private show() {
        this.element.style.display = 'block';
    }

    private hide() {
        this.element.style.display = 'none';
    }

    private scheduleRender() {
        if (this.renderTimer !== null) {
            window.clearTimeout(this.renderTimer);
        }
        this.renderTimer = window.setTimeout(this.renderTimeoutFunc, 1);
    }

    private render() {
        const grid = this.store.grids.get(this.store.cursor.gridIdx);
        const row = grid.startRow + this.store.cursor.row;
        const col = grid.startCol + this.store.cursor.col;
        if (row >= this.store.size.rows || col >= this.store.size.cols) {
            return;
        }

        const { width, height } = this.store.font;
        const x = col * width;
        const y = row * height;
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';

        const modeInfo = this.store.modeInfoList[this.store.modeIdx];
        const cell = grid.cells[this.store.cursor.row][this.store.cursor.col];
        const hl = this.store.hlMap.get(cell.hlID);
        // const hl = this.store.hlMap.get(modeInfo.attrID);
        const defaultHl = this.store.hlMap.get(0);

        const cursorWidth = width * (wcwidth(cell.text) || 1);

        this.element.style.backgroundColor = colorToCSS(hl.fg || defaultHl.fg);

        switch (modeInfo.cursorShape) {
            case 'block': {
                this.element.style.font = this.store.getFontStyle(hl);
                this.element.style.color = colorToCSS(hl.bg || defaultHl.bg);
                this.element.innerText = cell.text;
                this.element.style.width = cursorWidth + 'px';
                this.element.style.height = height + 'px';
                break;
            }
            case 'horizontal': {
                this.element.innerText = '';
                this.element.style.top = y + height - 1 + 'px';
                this.element.style.width = cursorWidth + 'px';
                this.element.style.height = '1px';
                break;
            }
            case 'vertical': {
                this.element.innerText = '';
                this.element.style.width = '1px';
                this.element.style.height = height + 'px';
                break;
            }
        }
    }
}
