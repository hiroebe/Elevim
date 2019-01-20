import { Neovim } from 'neovim';
import Store from './store';

export default class NeovimImagePreview {
    private element: HTMLDivElement;

    constructor(private readonly store: Store, private readonly nvimClient: Neovim) {
        this.element = document.getElementById('image-preview') as HTMLDivElement;
        this.initElement();

        this.nvimClient.subscribe('ElevimImagePreview');
        this.nvimClient.on('notification', this.onNotified.bind(this));
    }

    private initElement() {
        this.element.style.position = 'absolute';
        this.element.style.left = '0px';
        this.element.style.top = '0px';
        this.element.style.padding = '8px';
        this.element.style.display = 'none';
        this.element.style.backgroundColor = '#dddddd';
    }

    private onNotified(method: string, events: any[]) {
        if (method === 'ElevimImagePreview') {
            if (events.length < 1) {
                return;
            }
            switch (events[0]) {
                case 'show': {
                    if (events.length < 2) {
                        break;
                    }
                    const path = events[1] as string;
                    this.show(path);
                    break;
                }
                case 'hide': {
                    this.hide();
                    break;
                }
            }
        }
    }

    private show(path: string) {
        this.element.style.backgroundColor = this.store.hlMap.get(0).bg;

        const img = document.createElement('img');
        img.src = path + '?' + new Date().getTime();
        this.element.appendChild(img);

        this.element.style.display = 'block';

        const ratio = window.devicePixelRatio;
        img.onload = () => {
            const w = img.width;
            const h = img.height;
            const wRatio = w / this.store.size.width * ratio;
            const hRatio = h / this.store.size.height * ratio;
            if (wRatio > 0.9 && wRatio > hRatio) {
                img.width = w / wRatio * 0.9;
            } else if (hRatio > 0.9 && wRatio < hRatio) {
                img.height = h / hRatio * 0.9;
            }
        };
    }

    private hide() {
        this.element.removeChild(this.element.firstChild);
        this.element.style.display = 'none';
    }
}
