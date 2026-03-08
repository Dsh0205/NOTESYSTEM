document.addEventListener('DOMContentLoaded', () => {
  // 状态管理
  let notes = JSON.parse(localStorage.getItem('shanlic_notes')) || [];
  let activeNoteId = null;

  // DOM 元素
  const noteListEl = document.getElementById('note-list');
  const addNoteBtn = document.getElementById('add-note-btn');
  const searchInput = document.getElementById('search-input');
  const noteTitleInput = document.getElementById('note-title');
  const noteContentInput = document.getElementById('note-content');
  const lastModifiedEl = document.getElementById('last-modified');
  const previewEl = document.getElementById('markdown-preview');
  const tocListEl = document.getElementById('toc-list');
  const contextMenu = document.getElementById('context-menu');
  const deleteOption = document.getElementById('delete-note-option');
  const openOption = document.getElementById('open-note-option'); // New option
  const editorContainer = document.getElementById('editor-container');
  const emptyState = document.getElementById('empty-state');

  // 初始化
  renderNoteList();

  // 事件监听
  addNoteBtn.addEventListener('click', createNote);
  searchInput.addEventListener('input', (e) => renderNoteList(e.target.value));
  noteTitleInput.addEventListener('input', updateNote);
  noteContentInput.addEventListener('input', updateNote);

  // Ctrl+K 快捷键
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // 右键菜单相关
  document.addEventListener('click', () => {
    contextMenu.style.display = 'none';
  });

  deleteOption.addEventListener('click', () => {
    if (contextMenu.dataset.noteId) {
      deleteNote(parseInt(contextMenu.dataset.noteId));
    }
  });

  // New listener for Open
  if (openOption) {
    openOption.addEventListener('click', () => {
      if (contextMenu.dataset.noteId) {
        selectNote(parseInt(contextMenu.dataset.noteId));
      }
    });
  }

  // 创建新文档
  function createNote() {
    const newNote = {
      id: Date.now(),
      title: '无标题文档',
      content: '# 欢迎使用 SHANLIC LIFE\n\n## 这是一个二级标题\n\n开始你的记录吧...',
      lastModified: new Date().toLocaleString()
    };

    notes.push(newNote);
    saveNotes();
    renderNoteList();

    // 选中新文档
    selectNote(newNote.id);
  }

  // 渲染文档列表
  function renderNoteList(searchQuery = '') {
    noteListEl.innerHTML = '';
    const filteredNotes = notes.filter(note =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filteredNotes.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    filteredNotes.forEach(note => {
      const li = document.createElement('div');
      li.className = `note-item ${note.id === activeNoteId ? 'active' : ''}`;
      li.dataset.id = note.id;
      li.innerHTML = `
                <div class="note-item-title">${note.title || '无标题文档'}</div>
                <div class="note-item-date">${note.lastModified}</div>
            `;

      li.addEventListener('click', () => selectNote(note.id));
      li.addEventListener('contextmenu', (e) => showContextMenu(e, note.id));

      noteListEl.appendChild(li);
    });
  }

  // 选择文档
  function selectNote(id) {
    activeNoteId = id;
    const note = notes.find(n => n.id === id);

    if (!note) return;

    // 更新 UI 状态
    editorContainer.style.display = 'flex';
    emptyState.style.display = 'none';

    // 填充内容
    noteTitleInput.value = note.title;
    noteContentInput.value = note.content;
    lastModifiedEl.textContent = `最后修改时间: ${note.lastModified}`;

    // 更新预览和目录
    updatePreview(note.content);

    // 更新列表选中状态
    renderNoteList(searchInput.value);

    // 添加选中高亮动画
    const activeNoteEl = noteListEl.querySelector(`.note-item[data-id="${id}"]`);
    if (activeNoteEl) {
      // 先移除可能存在的类以重置动画
      activeNoteEl.classList.remove('highlight-anim');
      // 强制重绘
      void activeNoteEl.offsetWidth;
      // 添加动画类
      activeNoteEl.classList.add('highlight-anim');

      // 动画结束后移除
      setTimeout(() => {
        if (activeNoteEl) activeNoteEl.classList.remove('highlight-anim');
      }, 2000);
    }
  }

  // 更新文档内容
  function updateNote() {
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;

    note.title = noteTitleInput.value;
    note.content = noteContentInput.value;
    note.lastModified = new Date().toLocaleString();

    saveNotes();
    renderNoteList(searchInput.value);
    lastModifiedEl.textContent = `最后修改时间: ${note.lastModified}`;
    updatePreview(note.content);
  }

  // 保存到 LocalStorage
  function saveNotes() {
    localStorage.setItem('shanlic_notes', JSON.stringify(notes));
  }

  // 删除文档
  function deleteNote(id) {
    if (confirm('确定要删除这个文档吗？')) {
      notes = notes.filter(n => n.id !== id);
      saveNotes();

      if (activeNoteId === id) {
        activeNoteId = null;
        editorContainer.style.display = 'none';
        emptyState.style.display = 'flex';
      }

      renderNoteList(searchInput.value);
    }
  }

  // 显示右键菜单
  function showContextMenu(e, id) {
    e.preventDefault();
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.dataset.noteId = id;
  }

  // 更新预览和目录
  function updatePreview(markdown) {
    // 配置 marked 选项
    marked.setOptions({
      headerIds: true,
      gfm: true,
      breaks: true
    });

    // 生成 HTML
    const html = marked.parse(markdown);
    previewEl.innerHTML = html;

    // 生成目录
    generateTOC(markdown);
  }

  // 生成目录 (基于 Markdown 源码的简单解析，或者基于渲染后的 DOM)
  // 这里我们基于 Markdown 源码解析，更直接
  function generateTOC(markdown) {
    tocListEl.innerHTML = '';
    const lines = markdown.split('\n');
    const headers = [];

    // 正则匹配标题
    const headerRegex = /^(#{1,6})\s+(.+)$/;

    lines.forEach((line, index) => {
      const match = line.match(headerRegex);
      if (match) {
        headers.push({
          level: match[1].length,
          text: match[2],
          id: `header-${index}` // 简单生成 ID
        });
      }
    });

    // 为预览区的标题添加 ID 以便跳转 (这里需要重新处理 previewEl 的 DOM)
    // 更简单的做法是：解析 Markdown 后，遍历 previewEl 中的 H 标签
    // 这样可以确保 ID 与 TOC 对应

    // 清空之前的 TOC
    tocListEl.innerHTML = '';

    // 获取预览区的所有标题元素
    const headings = previewEl.querySelectorAll('h1, h2, h3, h4, h5, h6');

    headings.forEach((heading, index) => {
      const id = `heading-${index}`;
      heading.id = id;

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${id}`;
      a.textContent = heading.textContent;
      a.className = `toc-h${heading.tagName.substring(1)}`; // toc-h1, toc-h2...

      // 点击平滑滚动
      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
      });

      li.appendChild(a);
      tocListEl.appendChild(li);
    });
  }
});
