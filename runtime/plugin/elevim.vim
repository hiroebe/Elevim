if exists('g:loaded_elevim_plugin')
    finish
endif
let g:loaded_elevim_plugin = 1

command! -nargs=1 FinderFile call rpcnotify(0, 'ElevimFinder', 'file', <args>)
command! FinderFileOld call rpcnotify(0, 'ElevimFinder', 'file_old')
command! FinderFileRec call rpcnotify(0, 'ElevimFinder', 'file_rec')
command! FinderLoclist call rpcnotify(0, 'ElevimFinder', 'loclist')
command! FinderBuffer call rpcnotify(0, 'ElevimFinder', 'buffer')
command! FinderRegister call rpcnotify(0, 'ElevimFinder', 'register')
command! FinderGrep call s:finder_grep()
command! FinderTerm call rpcnotify(0, 'ElevimFinder', 'term')

function! s:finder_grep()
    let pattern = input('Pattern: ')
    let dir = input('dir: ', getcwd(), 'dir')
    call rpcnotify(0, 'ElevimFinder', 'grep', pattern, dir)
endfunction
