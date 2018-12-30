import wcwidth = require('wcwidth');
import Store from './store';

const specialKeys: { [key: string]: string } = {
    Enter: 'CR',
    Backspace: 'BS',
    Tab: 'Tab',
    Escape: 'Esc',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
};

export default class Input {

    private static keyWithMod(key: string): string {
        if (key in specialKeys) {
            return specialKeys[key];
        } else if (key === ' ') {
            return 'Space';
        }
        return key.length === 1 ? key : '';
    }

    private element: HTMLInputElement;
    private imeRunning: boolean;

    constructor(private readonly store: Store) {
        this.element = document.getElementById('input') as HTMLInputElement;
        this.imeRunning = false;

        this.element.addEventListener('compositionstart', this.startComposition.bind(this));
        this.element.addEventListener('compositionend', this.endComposition.bind(this));
        this.element.addEventListener('keydown', this.onKeydownEvent.bind(this));
        this.element.addEventListener('input', this.onInputEvent.bind(this));

        store.on('cursor-goto', this.updateElementPos.bind(this));
    }

    public focus() {
        this.element.focus();
    }

    private updateElementPos() {
        const ratio = window.devicePixelRatio;
        const { width, height } = this.store.font;
        const { row, col } = this.store.cursor;

        this.element.style.top = row * height / ratio + 'px';
        this.element.style.left = col * width / ratio + 'px';
    }

    private startComposition(_: CompositionEvent) {
        const ratio = window.devicePixelRatio;
        const { width, height, size, family } = this.store.font;
        const { row, col } = this.store.cursor;
        const hl = this.store.hlMap.get(0);
        this.element.style.color = hl.fg;
        this.element.style.backgroundColor = hl.bg;
        this.element.style.width = 'auto';
        this.element.style.font = size + 'px ' + family;
        this.element.style.top = row * height / ratio + 'px';
        this.element.style.left = col * width / ratio + 'px';

        this.imeRunning = true;
    }

    private endComposition(event: CompositionEvent) {
        this.inputToNvim(event.data, event);

        this.element.style.color = 'transparent';
        this.element.style.backgroundColor = 'transparent';
        this.element.style.width = '1px';

        this.imeRunning = false;
    }

    private onKeydownEvent(event: KeyboardEvent) {
        if (this.imeRunning) {
            return;
        }
        if (event.ctrlKey) {
            const withMod = Input.keyWithMod(event.key);
            if (withMod !== '') {
                this.inputToNvim('<C-' + withMod + '>', event);
            }
            return;
        } else if (event.shiftKey && event.key in specialKeys) {
            const withMod = Input.keyWithMod(event.key);
            if (withMod !== '') {
                this.inputToNvim('<S-' + withMod + '>', event);
            }
        }
        if (event.key in specialKeys) {
            this.inputToNvim('<' + specialKeys[event.key] + '>', event);
        }
    }

    private onInputEvent(event: KeyboardEvent) {
        if (this.imeRunning) {
            const ratio = window.devicePixelRatio;
            const { width } = this.store.font;
            const len = wcwidth(this.element.value);
            this.element.style.width = width / ratio * len + 'px';
            return;
        }
        const target = event.target as HTMLInputElement;
        const key = target.value === '<' ? '<LT>' : target.value;
        this.inputToNvim(key, event);
    }

    private inputToNvim(key: string, event: Event) {
        event.preventDefault();
        this.store.inputKey(key);
        const target = event.target as HTMLInputElement;
        target.value = '';
    }
}
