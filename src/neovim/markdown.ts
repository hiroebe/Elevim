import * as hljs from 'highlight.js';
import * as marked from 'marked';
import { Neovim } from 'neovim';
import Store from './store';

export default class Markdown {
    private element: HTMLDivElement;

    constructor(private readonly store: Store, private readonly nvimClient: Neovim) {
        this.element = document.getElementById('markdown') as HTMLDivElement;
        this.element.style.display = 'none';

        marked.setOptions({
            highlight: (code) => hljs.highlightAuto(code).value,
            gfm: true,
        });

        store.on('markdown', this.handler.bind(this));
    }

    private handler(method: string) {
        switch (method) {
            case 'start':
                this.start();
                break;
            case 'stop':
                this.stop();
                break;
            case 'update':
                this.update();
                break;
        }
    }

    private start() {
        this.element.style.display = 'block';
        this.store.emit('check-resize');
    }

    private stop() {
        this.element.style.display = 'none';
        this.store.emit('check-resize');
    }

    private update() {
        this.nvimClient.buffer.getLines().then((lines) => {
            const markdownString = lines.join('\n');
            const parsed = marked.parse(markdownString);
            this.element.innerHTML = parsed;
            this.store.emit('check-resize');
        });
    }
}
