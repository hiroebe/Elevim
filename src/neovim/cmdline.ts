import { shiftColor } from '../utils';
import Store, { Cell } from './store';

export default class NeovimCmdline {
    private container: HTMLDivElement;
    private cmdline: HTMLDivElement;
    private wildmenu: HTMLUListElement;
    private cursor: HTMLSpanElement;

    constructor(private readonly store: Store) {
        this.container = document.getElementById('cmdline-container') as HTMLDivElement;
        this.cmdline = document.getElementById('cmdline') as HTMLDivElement;
        this.wildmenu = document.getElementById('wildmenu') as HTMLUListElement;

        this.cursor = document.createElement('span') as HTMLSpanElement;
        this.cursor.style.display = 'inline';
        this.cursor.style.position = 'relative';
        this.cursor.style.borderLeft = '1px solid';

        this.container.style.display = 'none';
        this.wildmenu.style.display = 'none';

        store
            .on('cmdline-show', this.show.bind(this))
            .on('cmdline-pos', this.setpos.bind(this))
            .on('cmdline-hide', this.hide.bind(this))
            .on('wildmenu-show', this.wmShow.bind(this))
            .on('wildmenu-select', this.wmSelect.bind(this))
            .on('wildmenu-hide', this.wmHide.bind(this))
            .on('resize-screen', this.resize.bind(this))
            .on('update-specified-font', this.setFont.bind(this))
            .on('default-colors-set', this.setColor.bind(this));
    }

    private show(content: Cell[], pos: number, firstc: string, indent: number, level: number) {
        while (this.cmdline.firstChild) {
            this.cmdline.removeChild(this.cmdline.firstChild);
        }

        const ratio = window.devicePixelRatio;

        const firstcSpan = document.createElement('span');
        firstcSpan.innerText = firstc;
        this.cmdline.appendChild(firstcSpan);

        this.cursor.style.left = pos * this.store.font.width / ratio + 1 + 'px';
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
        this.cursor.style.left = pos * this.store.font.width / ratio + 1 + 'px';
    }

    private hide() {
        this.container.style.display = 'none';
    }

    private wmShow(items: string[]) {
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

        const beforeLi = selected === -1
            ? this.wildmenu.lastChild as HTMLLIElement
            : this.wildmenu.children[selected - 1] as HTMLLIElement;
        if (beforeLi) {
            beforeLi.style.color = hl.fg;
            beforeLi.style.backgroundColor = hl.bg;
        }

        const afterLi = this.wildmenu.children[selected + 1] as HTMLLIElement;
        if (afterLi) {
            afterLi.style.color = hl.fg;
            afterLi.style.backgroundColor = hl.bg;
        }
    }

    private wmHide() {
        this.wildmenu.style.display = 'none';
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
}
