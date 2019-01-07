import { Neovim } from 'neovim';
import Buffer from './finder/buffer';
import File from './finder/file';
import FileOld from './finder/file_old';
import FileRec from './finder/file_rec';
import Grep from './finder/grep';
import Line from './finder/line';
import Loclist from './finder/loclist';
import Register from './finder/register';
import Term from './finder/term';
import Store, { Cell, Inputter } from './store';

const defaultKeymap: { [key: string]: string } = {
    '<Esc>': 'exit',
    '<CR>': 'enter',
    '<BS>': 'backspace',
    '<Del>': 'delete',
    '<Space>': 'insertSpace',
    '<Tab>': 'cursorDown',
    '<Up>': 'cursorUp',
    '<Down>': 'cursorDown',
    '<Left>': 'cursorLeft',
    '<Right>': 'cursorRight',
    '<Home>': 'cursorHome',
    '<End>': 'cursorEnd',
    '<C-a>': 'cursorHome',
    '<C-b>': 'cursorLeft',
    '<C-c>': 'exit',
    '<C-d>': 'delete',
    '<C-e>': 'cursorEnd',
    '<C-f>': 'cursorRight',
    '<C-h>': 'backspace',
    '<C-m>': 'enter',
    '<C-n>': 'cursorDown',
    '<C-p>': 'cursorUp',
    '<C-u>': 'deleteToHome',
    '<C-[>': 'exit',
};

export interface Item {
    label: string;
}

interface ItemWithIdx extends Item {
    idx: number;
}

export interface Source {
    header: string;
    items: Item[];
    onStart: (args: string[], nvimClient: Neovim) => void;
    doAction: (selected: number, nvimClient: Neovim) => string[];
}

export default class Finder {
    private text: string;
    private cursor: number;
    private selected: number;
    private filteredItems: ItemWithIdx[];
    private source: Source;
    private sources: Map<string, Source>;

    constructor(private readonly store: Store, private readonly nvimClient: Neovim) {
        this.text = '';
        this.cursor = 0;
        this.selected = 0;
        this.filteredItems = [];
        this.source = null;
        this.sources = new Map();
        this.sources.set('file', new File());
        this.sources.set('file_old', new FileOld());
        this.sources.set('file_rec', new FileRec());
        this.sources.set('register', new Register());
        this.sources.set('grep', new Grep());
        this.sources.set('loclist', new Loclist());
        this.sources.set('buffer', new Buffer());
        this.sources.set('term', new Term());
        this.sources.set('line', new Line());

        store
            .on('input', this.input.bind(this))
            .on('finder-show', this.show.bind(this));
    }

    private input(to: Inputter, key: string) {
        if (to !== Inputter.finder) {
            return;
        }
        switch (defaultKeymap[key]) {
            case 'exit':
                this.hide();
                break;
            case 'enter':
                const item = this.filteredItems[this.selected];
                if (!item) {
                    break;
                }
                const newArgs = this.source.doAction(item.idx, this.nvimClient);
                if (newArgs.length === 0) {
                    this.hide();
                } else {
                    this.show(newArgs);
                }
                break;
            case 'backspace':
                this.backspace();
                break;
            case 'delete':
                this.del();
                break;
            case 'insertSpace':
                this.insert(' ');
                break;
            case 'cursorUp':
                this.selectionUp();
                break;
            case 'cursorDown':
                this.selectionDown();
                break;
            case 'cursorLeft':
                this.moveCursor(-1);
                break;
            case 'cursorRight':
                this.moveCursor(1);
                break;
            case 'cursorHome':
                this.cursorHome();
                break;
            case 'cursorEnd':
                this.cursorEnd();
                break;
            case 'deleteToHome':
                this.deleteToHome();
                break;
            default:
                if (key.length === 1) {
                    this.insert(key);
                }
        }
    }

    private async show(args: string[]) {
        const sourceName = args[0];
        const source = this.sources.get(sourceName);
        if (!source) {
            this.hide();
            return;
        }
        args.shift();
        await source.onStart(args, this.nvimClient);
        if (source.items.length === 0) {
            this.hide();
            return;
        }
        this.source = source;
        this.clear();
        this.refresh();
    }

    private hide() {
        this.store.emit('finder-hide');
        this.store.emit('wildmenu-hide');
        this.store.emit('cmdline-hide');
    }

    private clear() {
        this.text = '';
        this.cursor = 0;
        this.selected = 0;
        this.filteredItems = [];
    }

    private refresh() {
        this.filteredItems = this.filter(this.text, this.source.items);
        this.selected = 0;

        this.emitCmdlineShow();
        this.emitWildmenuShow();
        this.emitWildmenuSelect();
    }

    private emitCmdlineShow() {
        const content: Cell = { text: this.text, hlID: 0 };
        this.store.emit('cmdline-show', [content], this.cursor, '', 0, 0);
    }

    private emitCmdlinePos() {
        this.store.emit('cmdline-pos', this.cursor, 0);
    }

    private emitWildmenuShow() {
        const itemLabels = this.filteredItems.map((item) => item.label);
        this.store.emit('wildmenu-show', itemLabels, this.source.header);
    }

    private emitWildmenuSelect() {
        this.store.emit('wildmenu-select', this.selected);
    }

    private insert(key: string) {
        this.text = this.text.slice(0, this.cursor) + key + this.text.slice(this.cursor);
        this.cursor++;
        this.refresh();
    }

    private moveCursor(num: number) {
        const newCursor = this.cursor + num;
        if (newCursor >= 0 && newCursor <= this.text.length) {
            this.cursor = newCursor;
        }
        this.emitCmdlinePos();
    }

    private cursorHome() {
        this.cursor = 0;
        this.emitCmdlinePos();
    }

    private cursorEnd() {
        this.cursor = this.text.length;
        this.emitCmdlinePos();
    }

    private backspace() {
        if (this.cursor > 0) {
            this.text = this.text.slice(0, this.cursor - 1)  + this.text.slice(this.cursor);
            this.cursor--;
        }
        this.refresh();
    }

    private del() {
        if (this.cursor < this.text.length) {
            this.text = this.text.slice(0, this.cursor) + this.text.slice(this.cursor + 1);
        }
        this.refresh();
    }

    private deleteToHome() {
        this.text = this.text.slice(this.cursor);
        this.cursor = 0;
        this.refresh();
    }

    private selectionUp() {
        if (this.selected === 0) {
            this.selected = this.filteredItems.length - 1;
        } else {
            this.selected--;
        }
        this.emitWildmenuSelect();
    }

    private selectionDown() {
        if (this.selected === this.filteredItems.length - 1) {
            this.selected = 0;
        } else {
            this.selected++;
        }
        this.emitWildmenuSelect();
    }

    private filter(text: string, items: Item[]): ItemWithIdx[] {
        const filteredItems: ItemWithIdx[] = [];

        if (text.startsWith('/') && text.endsWith('/')) {
            const reg = new RegExp(text.slice(1, -1));
            for (let i = 0; i < items.length; i++) {
                if (reg.test(items[i].label.toLowerCase())) {
                    filteredItems.push({
                        label: items[i].label,
                        idx: i,
                    });
                }
            }
            return filteredItems;
        }

        const patterns = text.split(' ');
        for (let i = 0; i < items.length; i++) {
            let match = true;
            let idx = -1;
            for (const pattern of patterns) {
                const label = items[i].label.toLowerCase();
                idx = label.slice(idx + 1).indexOf(pattern);
                if (idx === -1) {
                    match = false;
                    break;
                }
            }
            if (match) {
                filteredItems.push({
                    label: items[i].label,
                    idx: i,
                });
            }
        }
        return filteredItems;
    }
}
