import wcwidth = require('wcwidth');
import { shiftColor } from '../utils';
import Store, { Cell } from './store';

export default class NeovimCmdline {
    private container: HTMLDivElement;
    private cmdline: HTMLDivElement;
    private header: HTMLDivElement;
    private wildmenu: HTMLUListElement;
    private cursor: HTMLSpanElement;
    private text: string;
    private manualMode: boolean;

    constructor(private readonly store: Store) {
        this.container = document.getElementById('cmdline-container') as HTMLDivElement;
        this.cmdline = document.getElementById('cmdline') as HTMLDivElement;
        this.header = document.getElementById('wildmenu-header') as HTMLDivElement;
        this.wildmenu = document.getElementById('wildmenu') as HTMLUListElement;

        this.cursor = document.createElement('span') as HTMLSpanElement;
        this.cursor.style.display = 'inline';
        this.cursor.style.position = 'relative';
        this.cursor.style.borderLeft = '1px solid';

        this.container.style.display = 'none';
        this.wildmenu.style.display = 'none';

        this.text = '';
        this.manualMode = false;

        store.eventEmitter
            .on('cmdline-show', this.show.bind(this))
            .on('cmdline-pos', this.setpos.bind(this))
            .on('cmdline-hide', this.hide.bind(this))
            .on('wildmenu-show', this.wmShow.bind(this))
            .on('wildmenu-select', this.wmSelect.bind(this))
            .on('wildmenu-hide', this.wmHide.bind(this))
            .on('screen-size-changed', this.resize.bind(this))
            .on('update-specified-font', this.setFont.bind(this))
            .on('default-colors-set', this.setColor.bind(this))
            .on('finder-show', () => this.manualMode = true)
            .on('finder-hide', () => this.manualMode = false);
    }

    private show(content: Cell[], pos: number, firstc: string, indent: number, level: number) {
        this.text = content.map((cell) => cell.text).join('');

        while (this.cmdline.firstChild) {
            this.cmdline.removeChild(this.cmdline.firstChild);
        }

        const ratio = window.devicePixelRatio;

        const firstcSpan = document.createElement('span');
        firstcSpan.innerText = firstc;
        this.cmdline.appendChild(firstcSpan);

        const correctPos = this.calcCorrectPos(pos);
        this.cursor.style.left = correctPos * this.store.font.width / ratio + 1 + 'px';
        this.cmdline.appendChild(this.cursor);

        for (const cell of content) {
            const span = document.createElement('span');
            const hl = this.store.hlMap.get(cell.hlID);
            span.style.color = hl.fg;
            span.innerText = cell.text;
            this.cmdline.appendChild(span);
        }

        this.container.style.display = 'block';
    }

    private setpos(pos: number, level: number) {
        const ratio = window.devicePixelRatio;
        const correctPos = this.calcCorrectPos(pos);
        this.cursor.style.left = correctPos * this.store.font.width / ratio + 1 + 'px';
    }

    private hide() {
        if (!this.manualMode) {
            this.container.style.display = 'none';
        }
    }

    private wmShow(items: string[], header: string = '') {
        if (header === '') {
            this.header.style.display = 'none';
        } else {
            const hl = this.store.hlMap.get(0);
            this.header.innerText = header;
            this.header.style.color = shiftColor(hl.fg, 0.5);
            this.header.style.display = 'block';
        }
        while (this.wildmenu.firstChild) {
            this.wildmenu.removeChild(this.wildmenu.firstChild);
        }

        for (const item of items) {
            const li = document.createElement('li');
            li.innerText = item;
            li.style.padding = '3px';
            this.wildmenu.appendChild(li);
        }

        this.wildmenu.style.display = 'block';
    }

    private wmSelect(selected: number) {
        const hl = this.store.hlMap.get(0);

        const li = this.wildmenu.children[selected] as HTMLLIElement;
        if (li) {
            li.style.color = hl.bg;
            li.style.backgroundColor = hl.fg;
            // @ts-ignore
            li.scrollIntoViewIfNeeded(false);
        }

        if (this.wildmenu.children.length === 1) {
            return;
        }

        const beforeLi = selected <= 0
            ? this.wildmenu.lastChild as HTMLLIElement
            : this.wildmenu.children[selected - 1] as HTMLLIElement;
        if (beforeLi) {
            beforeLi.style.color = hl.fg;
            beforeLi.style.backgroundColor = hl.bg;
        }

        const afterLi = selected === this.wildmenu.children.length - 1
            ? this.wildmenu.firstChild as HTMLLIElement
            : this.wildmenu.children[selected + 1] as HTMLLIElement;
        if (afterLi) {
            afterLi.style.color = hl.fg;
            afterLi.style.backgroundColor = hl.bg;
        }
    }

    private wmHide() {
        if (!this.manualMode) {
            this.header.style.display = 'none';
            this.wildmenu.style.display = 'none';
        }
    }

    private resize() {
        const ratio = window.devicePixelRatio;
        const { width, height } = this.store.size;
        this.container.style.top = '0px';
        this.container.style.left = width * 0.1 / ratio + 'px';
        this.container.style.width = width * 0.8 / ratio + 'px';
        this.wildmenu.style.maxHeight = height * 0.8 / ratio + 'px';
    }

    private setFont() {
        const { size, family } = this.store.font;
        this.container.style.font = size + 'px ' + family;
    }

    private setColor() {
        const hl = this.store.hlMap.get(0);
        if (!hl.fg || !hl.bg) {
            return;
        }
        this.container.style.color = hl.fg;
        this.container.style.backgroundColor = hl.bg;
        this.cmdline.style.backgroundColor = shiftColor(hl.bg, 0.5);
        this.cursor.style.borderColor = hl.fg;
    }

    private calcCorrectPos(pos: number): number {
        let wrongPos = 0;
        let correctPos = 0;
        for (let i = 0; i < this.text.length; i++) {
            const c = this.text[i];
            const w = wcwidth(c);
            wrongPos += w > 1 ? 3 : 1;
            correctPos += w;
            if (wrongPos === pos) {
                return correctPos;
            }
        }
        return pos;
    }
}
