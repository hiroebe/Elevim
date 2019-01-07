import { Neovim } from 'neovim';
import { Item, Source } from '../finder';

interface LineItem extends Item {
    linenr: number;
}

export default class Line implements Source {
    public header: string = 'Lines';
    public items: LineItem[];

    public async onStart(args: string[], nvimClient: Neovim) {
        const lines = await nvimClient.buffer.getLines() as string[];

        if (lines.length === 1 && lines[0] === '') {
            return;
        }

        for (let i = 0; i < lines.length; i++) {
            this.items.push({
                label: lines[i],
                linenr: i + 1,
            });
        }
    }

    public doAction(selected: number, nvimClient: Neovim): string[] {
        nvimClient.command('normal! ' + this.items[selected].linenr + 'G');
        return [];
    }
}
