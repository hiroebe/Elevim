import Store from './store';
import { colorToCSS, shiftColor } from '../utils';

export default class NeovimTabline {
    private padding: number = 3;
    private element: HTMLDivElement;

    constructor(private readonly store: Store) {
        this.element = document.getElementById('tabline') as HTMLDivElement;
        this.element.style.display = 'flex';

        store.eventEmitter
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
                div.style.borderColor = colorToCSS(shiftColor(hl.fg, 0.5));
            }

            if (i === tabnr) {
                div.style.color = colorToCSS(hl.fg);
                div.style.backgroundColor = colorToCSS(hl.bg);
            } else {
                div.style.color = colorToCSS(shiftColor(hl.fg, 0.5));
                div.style.backgroundColor = colorToCSS(shiftColor(hl.bg, 0.5));
            }

            this.element.appendChild(div);
        }
    }

    private setFont() {
        const { size, family } = this.store.font;
        this.element.style.font = size + 'px ' + family;
    }

    private resize() {
        this.element.style.height = this.store.font.height + this.padding * 2 + 'px';
        this.store.eventEmitter.emit('check-resize');
    }
}
