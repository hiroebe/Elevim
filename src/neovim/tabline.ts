import { shiftColor } from '../utils';
import Store from './store';

export default class NeovimTabline {
    private padding: number = 3;
    private element: HTMLDivElement;

    constructor(private readonly store: Store) {
        this.element = document.getElementById('tabline') as HTMLDivElement;
        this.element.style.display = 'flex';

        store
            .on('tabline-update', this.update.bind(this))
            .on('update-specified-font', this.setFont.bind(this))
            .on('update-font-size', this.resize.bind(this));
    }

    private update(tabnr: number, tabs: string[]) {
        // tabnr starts with 1.
        tabnr--;

        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }

        for (let i = 0; i < tabs.length; i++) {
            const hl = this.store.hlMap.get(0);

            const div = document.createElement('div');
            div.innerText = tabs[i];
            div.style.flex = 'auto';
            div.style.textAlign = 'center';
            div.style.padding = this.padding + 'px 0px';

            if (i > 0) {
                div.style.borderLeft = '1px solid';
                div.style.borderColor = shiftColor(hl.fg, 0.5);
            }

            if (i === tabnr) {
                div.style.color = hl.fg;
                div.style.backgroundColor = hl.bg;
            } else {
                div.style.color = shiftColor(hl.fg, 0.5);
                div.style.backgroundColor = shiftColor(hl.bg, 0.5);
            }

            this.element.appendChild(div);
        }
    }

    private setFont() {
        const { size, family } = this.store.font;
        this.element.style.font = size + 'px ' + family;
    }

    private resize() {
        const ratio = window.devicePixelRatio;
        this.element.style.height = this.store.font.height / ratio + this.padding * 2 + 'px';
    }
}
