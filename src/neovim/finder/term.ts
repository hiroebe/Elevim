import { Neovim } from 'neovim';
import { Item, Source } from '../finder';

interface TermItem extends Item {
    bufnr: number;
}

export default class Term implements Source {
    public header: string = 'Terminal';
    public items: TermItem[];

    public async onStart(args: string[], nvimClient: Neovim) {
        const buffers = await nvimClient.buffers;
        this.items = [];
        for (const buffer of buffers) {
            const name = await buffer.name;
            if (!name.startsWith('term://')) {
                continue;
            }
            const bufnr = buffer.data as number;
            const label = await buffer.getVar('term_title') as string;
            this.items.push({ label, bufnr });
        }
        return;
    }

    public doAction(selected: number, nvimClient: Neovim): string[] {
        const item = this.items[selected];
        nvimClient.command('buffer ' + item.bufnr);
        return [];
    }
}
