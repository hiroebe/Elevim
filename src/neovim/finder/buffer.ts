import { Neovim } from 'neovim';
import { Item, Source } from '../finder';

interface BufferItem extends Item {
    bufnr: number;
}

export default class Buffer implements Source {
    public header: string = 'Buffers';
    public items: BufferItem[];

    public async onStart(args: string[], nvimClient: Neovim) {
        const buffers = await nvimClient.buffers;
        for (const buffer of buffers) {
            let label = await buffer.name;
            if (label === '') {
                label = '[No Name]';
            }
            const bufnr = buffer.data as number;
            this.items.push({ label, bufnr });
        }
    }

    public doAction(selected: number, nvimClient: Neovim): string[] {
        const item = this.items[selected];
        nvimClient.command('buffer ' + item.bufnr);
        return [];
    }
}
