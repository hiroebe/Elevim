command! StartMarkdownPreview call s:start_markdown_preview()
command! StopMarkdownPreview call s:stop_markdown_preview()

function! s:start_markdown_preview()
    call rpcnotify(0, 'ElevimMarkdown', 'start')
    call rpcnotify(0, 'ElevimMarkdown', 'update')
    augroup elevim-markdown
        autocmd TextChanged,InsertLeave <buffer> call rpcnotify(0, 'ElevimMarkdown', 'update')
    augroup END
endfunction

function! s:stop_markdown_preview()
    call rpcnotify(0, 'ElevimMarkdown', 'stop')
    autocmd! elevim-markdown
endfunction
