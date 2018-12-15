import wcwidth = require('wcwidth');
import Store from './store';

export default class Cursor {
    private element: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private renderTimer: number;
    private renderTimeoutFunc: () => void;

    constructor(private readonly store: Store) {
        this.element = document.getElementById('cursor') as HTMLCanvasElement;
        this.ctx = this.element.getContext('2d');
        this.renderTimer = null;
        this.renderTimeoutFunc = () => {
            this.render();
            this.renderTimer = null;
        };

        store.onUpdateFontSize(this.resize.bind(this));
        store.onFlush(this.scheduleRender.bind(this));
        store.onBusyStart(this.hide.bind(this));
        store.onBusyStop(this.show.bind(this));
    }

    private show() {
        this.element.style.display = 'block';
    }

    private hide() {
        this.element.style.display = 'none';
    }

    private resize() {
        const ratio = window.devicePixelRatio;
        const { height } = this.store.font;

        this.element.height = height;
        this.element.style.height = height / ratio + 'px';
    }

    private scheduleRender() {
        if (this.renderTimer !== null) {
            window.clearTimeout(this.renderTimer);
        }
        this.renderTimer = window.setTimeout(this.renderTimeoutFunc, 1);
    }

    private render() {
        const { row, col } = this.store.cursor;
        if (row >= this.store.size.rows || col >= this.store.size.cols) {
            return;
        }

        const ratio = window.devicePixelRatio;
        const { width, height, size, family } = this.store.font;
        const x = col * width / ratio;
        const y = row * height / ratio;
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';

        const modeInfo = this.store.modeInfoList[this.store.modeIdx];
        const cell = this.store.grid[row][col];
        const hl = this.store.hlMap.get(cell.hlID);
        // const hl = this.store.hlMap.get(modeInfo.attrID);
        const defaultHl = this.store.hlMap.get(0);

        const cursorWidth = width * (wcwidth(cell.text) || 1);
        this.element.width = cursorWidth;
        this.element.style.width = cursorWidth / ratio + 'px';

        this.ctx.fillStyle = hl.fg || defaultHl.fg;
        this.ctx.fillRect(0, 0, cursorWidth, height);

        switch (modeInfo.cursorShape) {
            case 'block': {
                const margin = (this.store.lineHeight - 1.2) / 2 * height;
                this.element.style.clip = 'auto';
                this.ctx.textBaseline = 'top';
                this.ctx.font = this.store.getFontStyle(hl);
                this.ctx.fillStyle = hl.bg || defaultHl.bg;
                this.ctx.fillText(cell.text, 0, margin);
                break;
            }
            case 'horizontal': {
                const top = (height - 1) / ratio;
                const right = cursorWidth / ratio;
                const bottom = height / ratio;
                const left = 0;
                this.element.style.clip = `rect(${top}px, ${right}px, ${bottom}px, ${left}px)`;
                break;
            }
            case 'vertical': {
                const top = 0;
                const right = 1;
                const bottom = height / ratio;
                const left = 0;
                this.element.style.clip = `rect(${top}px, ${right}px, ${bottom}px, ${left}px)`;
                break;
            }
        }
    }
}
