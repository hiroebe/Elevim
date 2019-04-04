import Store, { PopupmenuItem } from './store';

export default class NeovimPopupmenu {
    private element: HTMLUListElement;
    private showingWildmenu: boolean;

    constructor(private readonly store: Store) {
        this.element = document.getElementById('popupmenu') as HTMLUListElement;
        this.showingWildmenu = false;

        store.eventEmitter
            .on('popupmenu-show', this.show.bind(this))
            .on('popupmenu-select', this.select.bind(this))
            .on('popupmenu-hide', this.hide.bind(this));
    }

    private show(items: PopupmenuItem[], selected: number, row: number, col: number, gridIdx: number) {
        if (gridIdx === -1) {
            this.store.eventEmitter.emit('wildmenu-show', items.map((i) => i.word));
            this.showingWildmenu = true;
            return;
        }
        this.showingWildmenu = false;

        const { startRow, startCol } = this.store.grids.get(gridIdx);
        row += startRow;
        col += startCol;
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }

        // | word kind menu |
        // itemsWidth = [4, 4, 4]
        // elemCols = 2 + (4) + (1 + 4) + (1 + 4)
        //
        // | word kind |
        // elemCols = 2 + (4) + (0) + (1 + 4)
        const itemsWidth = this.calcItemsWidth(items);
        const elemRows = Math.min(items.length, Math.floor(this.store.size.rows / 2) - 1);
        const elemCols = itemsWidth[0] + 2
            + (itemsWidth[1] > 0 ? itemsWidth[1] + 1 : 0)
            + (itemsWidth[2] > 0 ? itemsWidth[2] + 1 : 0);

        for (const item of items) {
            const li = document.createElement('li');
            li.innerText = this.formatItem(item, itemsWidth);
            this.element.appendChild(li);
        }

        const ratio = window.devicePixelRatio;
        const { width, height, size, family } = this.store.font;

        if (row + elemRows < this.store.size.rows) {
            // show below cursor
            this.element.style.top = (row + 1) * height / ratio + 'px';
            this.element.style.boxShadow = '3px 3px 3px 3px black';
        } else {
            // show above cursor
            this.element.style.top = (row - elemRows) * height / ratio + 'px';
            this.element.style.boxShadow = '3px -3px 3px 3px black';
        }
        this.element.style.left = (col - 1) * width / ratio + 'px';

        this.element.style.font = size + 'px ' + family;
        this.element.style.lineHeight = '' + this.store.lineHeight;
        this.element.style.maxHeight = elemRows * height / ratio + 'px';
        this.element.style.display = 'block';

        const hl = this.store.hlMap.get(0);
        this.element.style.color = hl.fg;
        this.element.style.backgroundColor = hl.bg;

        this.select(selected);
    }

    private select(select: number) {
        if (this.showingWildmenu) {
            this.store.eventEmitter.emit('wildmenu-select', select);
            return;
        }

        const hl = this.store.hlMap.get(0);

        const li = this.element.children[select] as HTMLLIElement;
        if (li) {
            li.style.color = hl.bg;
            li.style.backgroundColor = hl.fg;
            // @ts-ignore
            li.scrollIntoViewIfNeeded(false);
        }

        const beforeLi = select === -1
            ? this.element.lastChild as HTMLLIElement
            : this.element.children[select - 1] as HTMLLIElement;
        if (beforeLi) {
            beforeLi.style.color = hl.fg;
            beforeLi.style.backgroundColor = hl.bg;
        }

        const afterLi = this.element.children[select + 1] as HTMLLIElement;
        if (afterLi) {
            afterLi.style.color = hl.fg;
            afterLi.style.backgroundColor = hl.bg;
        }
    }

    private hide() {
        if (this.showingWildmenu) {
            this.store.eventEmitter.emit('wildmenu-hide');
            this.showingWildmenu = false;
        }
        this.element.style.display = 'none';
    }

    private calcItemsWidth(items: PopupmenuItem[]): [number, number, number] {
        let wordWidth = 0;
        let kindWidth = 0;
        let menuWidth = 0;
        for (const item of items) {
            if (item.word.length > wordWidth) {
                wordWidth = item.word.length;
            }
            if (item.kind.length > kindWidth) {
                kindWidth = item.kind.length;
            }
            if (item.menu.length > menuWidth) {
                menuWidth = item.menu.length;
            }
        }
        return [wordWidth, kindWidth, menuWidth];
    }

    private formatItem(item: PopupmenuItem, itemsWidth: [number, number, number]): string {
        const [wordWidth, kindWidth, menuWidth] = itemsWidth;
        let text = item.word;
        for (let i = item.word.length; i < wordWidth; i++) {
            text += ' ';
        }
        if (kindWidth > 0) {
            text += ' ' + item.kind;
            for (let i = item.kind.length; i < kindWidth; i++) {
                text += ' ';
            }
        }
        if (menuWidth > 0) {
            text += ' ' + item.menu;
            for (let i = item.menu.length; i < menuWidth; i++) {
                text += ' ';
            }
        }
        return ' ' + text + ' ';
    }
}
