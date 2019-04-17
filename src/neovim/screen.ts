import wcwidth = require('wcwidth');
import Cursor from './cursor';
import Input from './input';
import Store from './store';
import { colorToCSS } from '../utils';

export default class NeovimScreen {
    private cursor: Cursor;
    private input: Input;
    private flushTimer: number;

    constructor(private readonly store: Store) {
        this.cursor = new Cursor(store);
        this.input = new Input(store);

        document.getElementById('container').addEventListener('click', () => this.input.focus());

        store.eventEmitter
            .on('update-specified-font', this.measureFont.bind(this))
            .on('flush', this.scheduleFlush.bind(this));
    }

    private scheduleFlush() {
        if (this.flushTimer !== null) {
            window.clearTimeout(this.flushTimer);
        }
        this.flushTimer = window.setTimeout(this.flush.bind(this), 10);
    }

    private flush() {
        for (const gridIdx of this.store.grids.keys()) {
            this.drawGrid(gridIdx);
        }
    }

    private drawGrid(gridIdx: number) {
        const grid = this.store.grids.get(gridIdx);
        if (grid.display === 'none') {
            return;
        }
        const floating = grid.display === 'float';
        let html = '';
        for (let i = 0; i < grid.cells.length; i++) {
            let text = grid.cells[i][0].text;
            let hlID = grid.cells[i][0].hlID;
            for (let j = 1; j < grid.cells[i].length; j++) {
                const cell = grid.cells[i][j];
                if (cell.hlID === hlID) {
                    text += cell.text;
                } else {
                    html += this.buildSpanElem(text, hlID, floating);
                    text = cell.text;
                    hlID = cell.hlID;
                }
            }
            html += this.buildSpanElem(text, hlID, floating);
            html += '<br>';
        }
        grid.elem.style.font = this.store.getFontStyle();
        grid.elem.innerHTML = html;

        if (floating) {
            grid.elem.style.border = '1px solid black';
        } else {
            grid.elem.style.border = 'none';
        }
    }

    private objToCSS(map: { [key: string]: string }): string {
        let style = '';
        for (const key in map) {
            style += key + ': ' + map[key] + ';';
        }
        return style;
    }

    private buildSpanElem(text: string, hlID: number, floating: boolean = false): string {
        const escaped = text.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/[^\x20-\x7e]/g, (match: string) => {
                const style = this.objToCSS({
                    'display': 'inline-block',
                    'width': wcwidth(match) * this.store.font.width + 'px',
                });
                return '<span style="' + style + '">' + match + '</span>';
            });
        const style = this.objToCSS({ 'display': 'inline-block' });
        return '<span style="' + this.buildCSSStyle(hlID, floating) + style + '">' + escaped + '</span>';
    }

    private buildCSSStyle(hlID: number, floating: boolean): string {
        const hl = this.store.hlMap.get(hlID);
        const defaultHl = this.store.hlMap.get(0);
        let fg = colorToCSS(hl.fg || defaultHl.fg, floating ? 0.8 : 1);
        let bg = colorToCSS(hl.bg || defaultHl.bg, floating ? 0.9 : 1);
        if (hl.reverse) {
            [fg, bg] = [bg, fg];
        }
        const font = this.store.getFontStyle(hl);
        return this.objToCSS({
            'color': fg,
            'background-color': bg,
            'font': font,
        })
    }

    private measureFont() {
        const e = document.createElement('span');
        e.style.position = 'absolute';
        e.style.font = this.store.getFontStyle();
        e.innerText = 'A';
        document.body.appendChild(e);
        const width = e.clientWidth;
        const height = e.clientHeight;
        e.remove();
        this.store.eventEmitter.emit('update-font-size', width, height);
    }
}
