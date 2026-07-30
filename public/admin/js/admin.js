// ========== 口令验证 ==========
(function () {
  var PASSWORD = 'sgtvsadmin';
  var overlay = document.getElementById('auth-overlay');
  var modal = document.getElementById('auth-modal');
  var passwordInput = document.getElementById('auth-password');
  var submitBtn = document.getElementById('auth-submit');
  var errorEl = document.getElementById('auth-error');
  var mainContent = document.getElementById('admin-main-content');

  overlay.classList.add('active');

  function validate() {
    var value = passwordInput.value.trim();
    if (value === PASSWORD) {
      modal.classList.add('exit');
      overlay.classList.remove('active');
      setTimeout(function () {
        overlay.style.display = 'none';
        mainContent.style.display = '';
        mainContent.classList.add('visible');
        if (typeof initAdmin === 'function') {
          initAdmin();
        }
      }, 420);
    } else {
      modal.classList.remove('shake');
      void modal.offsetWidth;
      modal.classList.add('shake');
      passwordInput.classList.add('error');
      errorEl.classList.remove('hidden');
      passwordInput.value = '';
      passwordInput.focus();
      setTimeout(function () {
        passwordInput.classList.remove('error');
      }, 500);
    }
  }

  submitBtn.addEventListener('click', validate);
  passwordInput.addEventListener('keydown', function (e) {
    if (e.keyCode === 13) {
      e.preventDefault();
      validate();
    }
    errorEl.classList.add('hidden');
    passwordInput.classList.remove('error');
  });
  passwordInput.focus();
})();

(function () {
  'use strict';

  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  var currentTab = 'members';
  var editingId = null; // null = adding, number = editing
  var editingType = null; // 'members' or 'timeline'

  var membersData = [];      // local data (unsaved)
  var timelineData = [];     // local data (unsaved)
  var settingsData = {};
  var membersChanged = false;
  var timelineChanged = false;

  var isInitialLoadMembers = true;
  var isInitialLoadTimeline = true;

  // -----------------------------------------------------------------------
  // DOM references
  // -----------------------------------------------------------------------
  var tabBtns = document.querySelectorAll('.tab-btn');
  var tabSettings = document.getElementById('tab-settings');
  var tabMembers = document.getElementById('tab-members');
  var tabTimeline = document.getElementById('tab-timeline');
  var settingsForm = document.getElementById('settings-form');
  var membersList = document.getElementById('members-list');
  var timelineList = document.getElementById('timeline-list');
  var membersEmpty = document.getElementById('members-empty');
  var timelineEmpty = document.getElementById('timeline-empty');
  var btnAddMember = document.getElementById('btn-add-member');
  var btnAddEvent = document.getElementById('btn-add-event');
  var btnSaveMembers = document.getElementById('btn-save-members');
  var btnSaveTimeline = document.getElementById('btn-save-timeline');
  var btnSaveSettings = document.getElementById('btn-save-settings');

  var modalOverlay = document.getElementById('modal-overlay');
  var modalTitle = document.getElementById('modal-title');
  var modalForm = document.getElementById('modal-form');
  var formFields = document.getElementById('form-fields');
  var btnCancel = document.getElementById('btn-cancel');
  var btnClose = document.getElementById('modal-close');

  // -----------------------------------------------------------------------
  // Tab switching
  // -----------------------------------------------------------------------
  function switchTab(tab) {
    currentTab = tab;
    tabBtns.forEach(function (btn) {
      var isActive = btn.getAttribute('data-tab') === tab;
      btn.classList.toggle('active', isActive);
    });
    if (tabSettings) tabSettings.classList.toggle('active', tab === 'settings');
    tabMembers.classList.toggle('active', tab === 'members');
    tabTimeline.classList.toggle('active', tab === 'timeline');
  }

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function showEmptyState(list, emptyEl, items) {
    var isEmpty = !items || items.length === 0;
    list.classList.toggle('hidden', isEmpty);
    emptyEl.classList.toggle('hidden', !isEmpty);
  }

  function getMaxId(arr) {
    return arr.reduce(function (max, item) { return item.id > max ? item.id : max; }, 0);
  }

  // -----------------------------------------------------------------------
  // API helpers
  // -----------------------------------------------------------------------
  function api(method, url, body) {
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (err) { throw new Error(err.error || 'Request failed'); });
      }
      return res.json();
    });
  }

  function uploadFile(file) {
    var formData = new FormData();
    formData.append('file', file);
    return fetch('/api/upload', {
      method: 'POST',
      body: formData
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (err) { throw new Error(err.error || 'Upload failed'); });
      }
      return res.json();
    });
  }

  // -----------------------------------------------------------------------
  // Update save buttons
  // -----------------------------------------------------------------------
  function updateSaveButtons() {
    if (btnSaveMembers) {
      btnSaveMembers.classList.toggle('has-changes', membersChanged);
    }
    if (btnSaveTimeline) {
      btnSaveTimeline.classList.toggle('has-changes', timelineChanged);
    }
  }

  // -----------------------------------------------------------------------
  // FLIP animation
  // -----------------------------------------------------------------------
  function flipAnimate(container, renderFn, data) {
    var oldRects = {};
    var items = container.querySelectorAll('.data-item');
    items.forEach(function (el) {
      var id = el.getAttribute('data-id');
      oldRects[id] = el.getBoundingClientRect();
    });

    renderFn(data);

    var newItems = container.querySelectorAll('.data-item');
    newItems.forEach(function (el) {
      var id = el.getAttribute('data-id');
      var oldRect = oldRects[id];
      if (!oldRect) return;
      var newRect = el.getBoundingClientRect();
      var dx = oldRect.left - newRect.left;
      var dy = oldRect.top - newRect.top;
      if (dx === 0 && dy === 0) return;

      el.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      el.style.transition = 'none';
      el.offsetHeight;
      el.style.transition = 'all 0.5s ease-in-out';
      el.style.transform = '';
    });
  }

  // -----------------------------------------------------------------------
  // Members
  // -----------------------------------------------------------------------
  function loadMembers() {
    return api('GET', '/api/members').then(function (members) {
      membersData = members;
      membersChanged = false;
      isInitialLoadMembers = true;
      renderMembers(membersData);
      updateSaveButtons();
      return members;
    });
  }

  function renderMembers(members) {
    membersList.innerHTML = '';
    showEmptyState(membersList, membersEmpty, members);

    members.forEach(function (member, index) {
      var item = document.createElement('div');
      item.className = 'data-item';
      item.setAttribute('data-id', member.id);

      // Stagger animation on initial load
      if (isInitialLoadMembers) {
        item.classList.add('item-stagger');
        item.style.animationDelay = (index * 80) + 'ms';
      }

      // Enter animation for newly added items
      if (member._isNew) {
        item.classList.add('item-enter');
        delete member._isNew;
      }

      // Order badge
      var badge = document.createElement('span');
      badge.className = 'order-badge';
      badge.textContent = index + 1;

      // Content
      var content = document.createElement('div');
      content.className = 'item-content';

      var title = document.createElement('div');
      title.className = 'item-title';
      title.textContent = member.title;

      var subtitle = document.createElement('div');
      subtitle.className = 'item-subtitle';
      subtitle.textContent = member.subtitle;

      // Extra info line
      var extra = document.createElement('div');
      extra.className = 'item-extra';
      var extraParts = [];
      if (member.showDescription === false) {
        extraParts.push('简介已隐藏');
      }
      var clickLabels = { 'detail': '点击查看详情', 'scroll': '滚动至 section', 'link': '跳转链接' };
      if (member.clickAction && member.clickAction !== 'none' && clickLabels[member.clickAction]) {
        extraParts.push(clickLabels[member.clickAction]);
      }
      extra.textContent = extraParts.join(' \u00B7 ');

      var desc = document.createElement('div');
      desc.className = 'item-desc';
      desc.textContent = member.description || '';

      content.appendChild(title);
      content.appendChild(subtitle);
      content.appendChild(extra);
      content.appendChild(desc);

      // Actions
      var actions = document.createElement('div');
      actions.className = 'item-actions';

      // Up button
      var upBtn = document.createElement('button');
      upBtn.className = 'sort-btn';
      upBtn.innerHTML = '↑';
      upBtn.title = '上移';
      upBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        moveMemberUp(index);
      });

      // Down button
      var downBtn = document.createElement('button');
      downBtn.className = 'sort-btn';
      downBtn.innerHTML = '↓';
      downBtn.title = '下移';
      downBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        moveMemberDown(index);
      });

      var editBtn = document.createElement('button');
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.textContent = '编辑';
      editBtn.addEventListener('click', function () { openMemberForm(member); });

      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger btn-sm';
      deleteBtn.textContent = '删除';
      deleteBtn.addEventListener('click', function () { deleteMember(member.id); });

      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      // Assemble
      item.appendChild(badge);
      item.appendChild(content);
      item.appendChild(actions);

      membersList.appendChild(item);
    });

    isInitialLoadMembers = false;
  }

  function addMember(data) {
    var maxId = getMaxId(membersData);
    var newMember = {
      id: maxId + 1,
      title: data.title || '',
      subtitle: data.subtitle || '',
      image: data.image || '',
      description: data.description || '',
      showDescription: data.showDescription !== false,
      clickAction: data.clickAction || 'none',
      clickActionValue: data.clickActionValue || '',
      order: membersData.length,
      _isNew: true
    };
    membersData.push(newMember);
    membersChanged = true;
    renderMembers(membersData);
    updateSaveButtons();
  }

  function updateMember(id, data) {
    var member = null;
    for (var i = 0; i < membersData.length; i++) {
      if (membersData[i].id === id) {
        member = membersData[i];
        break;
      }
    }
    if (!member) return;
    member.title = data.title || '';
    member.subtitle = data.subtitle || '';
    member.image = data.image || '';
    member.description = data.description || '';
    member.showDescription = data.showDescription !== false;
    member.clickAction = data.clickAction || 'none';
    member.clickActionValue = data.clickActionValue || '';
    membersChanged = true;
    renderMembers(membersData);
    updateSaveButtons();
  }

  function deleteMember(id) {
    if (!confirm('确定要删除该卡片吗？')) return;

    // Find the item element and play leave animation
    var itemEl = membersList.querySelector('.data-item[data-id="' + id + '"]');
    if (itemEl) {
      itemEl.classList.add('item-leave');
      setTimeout(function () {
        membersData = membersData.filter(function (m) { return m.id !== id; });
        membersChanged = true;
        renderMembers(membersData);
        updateSaveButtons();
      }, 400);
    } else {
      membersData = membersData.filter(function (m) { return m.id !== id; });
      membersChanged = true;
      renderMembers(membersData);
      updateSaveButtons();
    }
  }

  function moveMemberUp(index) {
    if (index <= 0) return;
    swapMembers(index, index - 1);
  }

  function moveMemberDown(index) {
    if (index >= membersData.length - 1) return;
    swapMembers(index, index + 1);
  }

  function swapMembers(i, j) {
    var temp = membersData[i];
    membersData[i] = membersData[j];
    membersData[j] = temp;

    membersChanged = true;
    flipAnimate(membersList, renderMembers, membersData);
    updateSaveButtons();
  }

  function saveMembers() {
    var payload = membersData.map(function (m) {
      return {
        id: m.id,
        title: m.title,
        subtitle: m.subtitle,
        image: m.image,
        description: m.description,
        showDescription: m.showDescription !== false,
        clickAction: m.clickAction || 'none',
        clickActionValue: m.clickActionValue || '',
        order: m.order
      };
    });
    api('PUT', '/api/members/save', payload).then(function () {
      membersChanged = false;
      updateSaveButtons();
      // Reload to sync order from server
      return loadMembers();
    }).catch(function (err) {
      alert('保存失败：' + err.message);
    });
  }

  // -----------------------------------------------------------------------
  // Timeline
  // -----------------------------------------------------------------------
  function loadTimeline() {
    return api('GET', '/api/timeline').then(function (events) {
      timelineData = events;
      timelineChanged = false;
      isInitialLoadTimeline = true;
      renderTimeline(timelineData);
      updateSaveButtons();
      return events;
    });
  }

  function renderTimeline(events) {
    timelineList.innerHTML = '';
    showEmptyState(timelineList, timelineEmpty, events);

    var typeMap = { 'both': '双卡片', 'image-text': '图文', 'text-only': '纯文本' };

    events.forEach(function (event, index) {
      var item = document.createElement('div');
      item.className = 'data-item';
      item.setAttribute('data-id', event.id);

      // Stagger animation on initial load
      if (isInitialLoadTimeline) {
        item.classList.add('item-stagger');
        item.style.animationDelay = (index * 80) + 'ms';
      }

      // Enter animation for newly added items
      if (event._isNew) {
        item.classList.add('item-enter');
        delete event._isNew;
      }

      // Order badge (date year)
      var badge = document.createElement('span');
      badge.className = 'order-badge';
      badge.textContent = event.date ? event.date.substring(0, 4) : '';

      // Content
      var content = document.createElement('div');
      content.className = 'item-content';

      var title = document.createElement('div');
      title.className = 'item-title';
      title.textContent = event.title;

      var subtitle = document.createElement('div');
      subtitle.className = 'item-subtitle';
      subtitle.textContent = event.date + ' · ' + (typeMap[event.cardType] || '双卡片') + (event.link ? ' · 有链接' : '');

      var desc = document.createElement('div');
      desc.className = 'item-desc';
      desc.textContent = event.shortDesc || '';

      content.appendChild(title);
      content.appendChild(subtitle);
      content.appendChild(desc);

      // Actions (no sort buttons for timeline)
      var actions = document.createElement('div');
      actions.className = 'item-actions';

      var editBtn = document.createElement('button');
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.textContent = '编辑';
      editBtn.addEventListener('click', function () { openTimelineForm(event); });

      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger btn-sm';
      deleteBtn.textContent = '删除';
      deleteBtn.addEventListener('click', function () { deleteTimeline(event.id); });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      // Assemble
      item.appendChild(badge);
      item.appendChild(content);
      item.appendChild(actions);

      timelineList.appendChild(item);
    });

    isInitialLoadTimeline = false;
  }

  function addEvent(data) {
    var maxId = getMaxId(timelineData);
    var newEvent = {
      id: maxId + 1,
      date: data.date || '',
      title: data.title || '',
      shortDesc: data.shortDesc || '',
      detailDesc: data.detailDesc || '',
      image: data.image || '',
      cardType: data.cardType || 'both',
      link: data.link || '',
      _isNew: true
    };
    timelineData.push(newEvent);
    // Sort by date descending
    timelineData.sort(function (a, b) { return b.date.localeCompare(a.date); });
    timelineChanged = true;
    renderTimeline(timelineData);
    updateSaveButtons();
  }

  function updateEvent(id, data) {
    var event = null;
    for (var i = 0; i < timelineData.length; i++) {
      if (timelineData[i].id === id) {
        event = timelineData[i];
        break;
      }
    }
    if (!event) return;
    event.date = data.date || '';
    event.title = data.title || '';
    event.shortDesc = data.shortDesc || '';
    event.detailDesc = data.detailDesc || '';
    event.image = data.image || '';
    event.cardType = data.cardType || 'both';
    event.link = data.link || '';
    // Sort by date descending
    timelineData.sort(function (a, b) { return b.date.localeCompare(a.date); });
    timelineChanged = true;
    renderTimeline(timelineData);
    updateSaveButtons();
  }

  function deleteTimeline(id) {
    if (!confirm('确定要删除该活动吗？')) return;

    // Find the item element and play leave animation
    var itemEl = timelineList.querySelector('.data-item[data-id="' + id + '"]');
    if (itemEl) {
      itemEl.classList.add('item-leave');
      setTimeout(function () {
        timelineData = timelineData.filter(function (e) { return e.id !== id; });
        timelineChanged = true;
        renderTimeline(timelineData);
        updateSaveButtons();
      }, 400);
    } else {
      timelineData = timelineData.filter(function (e) { return e.id !== id; });
      timelineChanged = true;
      renderTimeline(timelineData);
      updateSaveButtons();
    }
  }

  function saveTimeline() {
    var payload = timelineData.map(function (e) {
      return {
        id: e.id,
        date: e.date,
        title: e.title,
        shortDesc: e.shortDesc,
        detailDesc: e.detailDesc,
        image: e.image,
        cardType: e.cardType || 'both',
        link: e.link || '',
        order: e.order
      };
    });
    api('PUT', '/api/timeline/save', payload).then(function () {
      timelineChanged = false;
      updateSaveButtons();
      return loadTimeline();
    }).catch(function (err) {
      alert('保存失败：' + err.message);
    });
  }

  // -----------------------------------------------------------------------
  // Settings
  // -----------------------------------------------------------------------
  function loadSettings() {
    return api('GET', '/api/settings').then(function (data) {
      settingsData = data;
      renderSettings(settingsData);
      return data;
    });
  }

  function renderSettings(data) {
    if (!settingsForm) return;
    var fields = [
      { key: 'wechat', label: '现任台长微信', placeholder: '微信号' },
      { key: 'officialAccount', label: '公众号 ID', placeholder: '公众号 ID' },
      { key: 'videoChannel', label: '视频号昵称', placeholder: '视频号昵称' },
      { key: 'bilibili', label: 'B 站账号 UID ', placeholder: 'B 站 UID' }
    ];
    var html = '';
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var val = data[f.key] || '';
      html +=
        '<div class="form-group settings-field">' +
          '<label class="form-label" for="field-' + f.key + '">' + f.label + '</label>' +
          '<input class="form-input" id="field-' + f.key + '" type="text" placeholder="' + f.placeholder + '" value="' + escapeHtml(val) + '">' +
        '</div>';
    }
    settingsForm.innerHTML = html;
  }

  function saveSettings() {
    if (!settingsForm) return;
    var inputs = settingsForm.querySelectorAll('.settings-field .form-input');
    var data = {};
    inputs.forEach(function (input) {
      var key = input.id.replace('field-', '');
      data[key] = input.value;
    });
    api('PUT', '/api/settings/save', data).then(function () {
      alert('保存成功');
      return loadSettings();
    }).catch(function (err) {
      alert('保存失败：' + err.message);
    });
  }

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', saveSettings);
  }

  // -----------------------------------------------------------------------
  // Modal forms
  // -----------------------------------------------------------------------
  function openMemberForm(member) {
    editingType = 'members';
    if (member) {
      editingId = member.id;
      modalTitle.textContent = '编辑卡片';
    } else {
      editingId = null;
      modalTitle.textContent = '新增卡片';
    }

    var showDesc = member ? member.showDescription : true;
    var clickAction = member ? (member.clickAction || 'none') : 'none';
    var clickValue = member ? (member.clickActionValue || '') : '';

    var actionValueHtml = '';
    if (clickAction !== 'none') {
      var labelMap = { 'detail': '详情文本', 'scroll': '目标 Section 选择器', 'link': '跳转链接' };
      var placeholderMap = { 'detail': '', 'scroll': '#section-id', 'link': 'https://...' };
      var isTextarea = clickAction === 'detail';
      var inputHtml = isTextarea
        ? '<textarea class="form-textarea" id="field-clickActionValue">' + escapeHtml(clickValue) + '</textarea>'
        : '<input class="form-input" id="field-clickActionValue" type="text" placeholder="' + placeholderMap[clickAction] + '" value="' + escapeHtml(clickValue) + '">';
      actionValueHtml =
        '<div class="form-group dynamic-action-value visible" id="action-value-group">' +
          '<label class="form-label" for="field-clickActionValue">' + labelMap[clickAction] + '</label>' +
          inputHtml +
        '</div>';
    } else {
      actionValueHtml = '<div class="form-group dynamic-action-value" id="action-value-group"></div>';
    }

    var clickActionOptions = [
      { value: 'none', label: '无行为' },
      { value: 'detail', label: '展示详情文本' },
      { value: 'scroll', label: '滚动到某个section' },
      { value: 'link', label: '跳转链接' }
    ];
    var optionsHtml = '';
    for (var oi = 0; oi < clickActionOptions.length; oi++) {
      var opt = clickActionOptions[oi];
      var selected = opt.value === clickAction ? ' selected' : '';
      optionsHtml += '<option value="' + opt.value + '"' + selected + '>' + opt.label + '</option>';
    }

    formFields.innerHTML =
      '<div class="form-group">' +
        '<label class="form-label" for="field-title">标题</label>' +
        '<input class="form-input" id="field-title" type="text" value="' + escapeHtml(member ? member.title : '') + '" required>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="field-subtitle">副标题</label>' +
        '<input class="form-input" id="field-subtitle" type="text" value="' + escapeHtml(member ? member.subtitle : '') + '" required>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">图片</label>' +
        '<div class="file-input-wrapper">' +
          '<input type="file" id="field-image-file" accept="image/*" class="file-input">' +
          '<input type="hidden" id="field-image" value="' + escapeHtml(member ? member.image : '') + '">' +
          '<div id="image-preview" class="image-preview">' +
            (member && member.image ? '<img src="' + escapeHtml(member.image) + '" alt="preview" style="max-width:120px;max-height:80px;border-radius:8px;margin-top:4px;display:block;">' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="field-description">简介</label>' +
        '<textarea class="form-textarea" id="field-description">' + escapeHtml(member ? member.description : '') + '</textarea>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="checkbox-label">' +
          '<input type="checkbox" id="field-showDescription"' + (showDesc ? ' checked' : '') + '>' +
          '展示简介' +
        '</label>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="field-clickAction">点击行为</label>' +
        '<select class="form-select" id="field-clickAction">' + optionsHtml + '</select>' +
      '</div>' +
      actionValueHtml;

    // Set up click action change listener
    var clickActionSelect = document.getElementById('field-clickAction');
    if (clickActionSelect) {
      clickActionSelect.addEventListener('change', function () {
        updateActionValueGroup();
      });
    }

    // Set up file upload listener
    setupFileUpload();

    modalOverlay.classList.remove('hidden');
  }

  function updateActionValueGroup() {
    var select = document.getElementById('field-clickAction');
    var container = document.getElementById('action-value-group');
    if (!select || !container) return;
    var val = select.value;
    if (val === 'none') {
      container.classList.remove('visible');
      setTimeout(function () {
        container.innerHTML = '';
      }, 300);
    } else {
      var labelMap = { 'detail': '详情文本', 'scroll': '目标 Section 选择器', 'link': '跳转链接' };
      var placeholderMap = { 'detail': '', 'scroll': '#section-id', 'link': 'https://...' };
      var isTextarea = val === 'detail';
      var currentValue = '';
      var existingInput = container.querySelector('#field-clickActionValue');
      if (existingInput) {
        currentValue = existingInput.value;
      }
      var inputHtml = isTextarea
        ? '<textarea class="form-textarea" id="field-clickActionValue">' + escapeHtml(currentValue) + '</textarea>'
        : '<input class="form-input" id="field-clickActionValue" type="text" placeholder="' + placeholderMap[val] + '" value="' + escapeHtml(currentValue) + '">';
      container.innerHTML =
        '<label class="form-label" for="field-clickActionValue">' + labelMap[val] + '</label>' +
        inputHtml;
      container.classList.add('visible');
    }
  }

  function openTimelineForm(event) {
    editingType = 'timeline';
    if (event) {
      editingId = event.id;
      modalTitle.textContent = '编辑活动';
    } else {
      editingId = null;
      modalTitle.textContent = '新增活动';
    }

    formFields.innerHTML =
      '<div class="form-group">' +
        '<label class="form-label" for="field-date">日期</label>' +
        '<input class="form-input" id="field-date" type="date" value="' + escapeHtml(event ? event.date : '') + '" required>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="field-title">标题</label>' +
        '<input class="form-input" id="field-title" type="text" value="' + escapeHtml(event ? event.title : '') + '" required>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="field-shortDesc">简短描述（于图文卡片）</label>' +
        '<textarea class="form-textarea" id="field-shortDesc">' + escapeHtml(event ? event.shortDesc : '') + '</textarea>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="field-detailDesc">详细描述（纯文本卡片）</label>' +
        '<textarea class="form-textarea" id="field-detailDesc">' + escapeHtml(event ? event.detailDesc : '') + '</textarea>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">图片</label>' +
        '<div class="file-input-wrapper">' +
          '<input type="file" id="field-image-file" accept="image/*" class="file-input">' +
          '<input type="hidden" id="field-image" value="' + escapeHtml(event ? event.image : '') + '">' +
          '<div id="image-preview" class="image-preview">' +
            (event && event.image ? '<img src="' + escapeHtml(event.image) + '" alt="preview" style="max-width:120px;max-height:80px;border-radius:8px;margin-top:4px;display:block;">' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">卡片类型</label>' +
        '<div class="radio-group">' +
          '<label class="radio-label"><input type="radio" name="cardType" value="both" ' + ((!event || event.cardType === 'both') ? 'checked' : '') + '> 双卡片</label>' +
          '<label class="radio-label"><input type="radio" name="cardType" value="image-text" ' + ((event && event.cardType === 'image-text') ? 'checked' : '') + '> 图文卡片</label>' +
          '<label class="radio-label"><input type="radio" name="cardType" value="text-only" ' + ((event && event.cardType === 'text-only') ? 'checked' : '') + '> 纯文本卡片</label>' +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="field-link">超链接（可选）</label>' +
        '<input class="form-input" id="field-link" type="url" placeholder="https://..." value="' + escapeHtml(event ? event.link : '') + '">' +
      '</div>';

    // Set up file upload listener
    setupFileUpload();

    modalOverlay.classList.remove('hidden');
  }

  // -----------------------------------------------------------------------
  // File upload handling
  // -----------------------------------------------------------------------
  function setupFileUpload() {
    var fileInput = document.getElementById('field-image-file');
    if (!fileInput) return;
    // Remove previous listener by cloning
    var newInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newInput, fileInput);
    newInput.addEventListener('change', function () {
      var file = newInput.files[0];
      if (!file) return;
      var preview = document.getElementById('image-preview');
      if (preview) {
        preview.innerHTML = '<span style="color:#9ca3af;font-size:12px;">上传中…</span>';
      }
      uploadFile(file).then(function (result) {
        var imageUrl = result.url;
        document.getElementById('field-image').value = imageUrl;
        if (preview) {
          preview.innerHTML = '<img src="' + escapeHtml(imageUrl) + '" alt="preview" style="max-width:120px;max-height:80px;border-radius:8px;margin-top:4px;display:block;">';
        }
      }).catch(function (err) {
        alert('图片上传失败：' + err.message);
        if (preview) {
          preview.innerHTML = '';
        }
      });
    });
  }

  // -----------------------------------------------------------------------
  // Modal form submission
  // -----------------------------------------------------------------------
  function getFormData() {
    var data = {};
    var inputs = formFields.querySelectorAll('input, textarea, select');
    inputs.forEach(function (input) {
      if (input.type === 'file') return;
      if (input.type === 'radio') {
        if (input.checked) {
          data[input.name] = input.value;
        }
        return;
      }
      if (input.type === 'checkbox') {
        data[input.id.replace('field-', '')] = input.checked;
        return;
      }
      var key = input.id.replace('field-', '');
      data[key] = input.value;
    });
    return data;
  }

  modalForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = getFormData();

    if (editingType === 'members') {
      var memberData = {
        title: data.title || '',
        subtitle: data.subtitle || '',
        image: data.image || '',
        description: data.description || '',
        showDescription: data.showDescription !== false,
        clickAction: data.clickAction || 'none',
        clickActionValue: data.clickActionValue || ''
      };

      if (editingId !== null) {
        updateMember(editingId, memberData);
      } else {
        addMember(memberData);
      }
      closeModal();
    } else if (editingType === 'timeline') {
      var timelinePayload = {
        date: data.date || '',
        title: data.title || '',
        shortDesc: data.shortDesc || '',
        detailDesc: data.detailDesc || '',
        image: data.image || '',
        cardType: data.cardType || 'both',
        link: data.link || ''
      };

      if (editingId !== null) {
        updateEvent(editingId, timelinePayload);
      } else {
        addEvent(timelinePayload);
      }
      closeModal();
    }
  });

  // -----------------------------------------------------------------------
  // Modal helpers
  // -----------------------------------------------------------------------
  function closeModal() {
    modalOverlay.classList.add('hidden');
    editingId = null;
    editingType = null;
  }

  btnCancel.addEventListener('click', closeModal);
  btnClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });

  // -----------------------------------------------------------------------
  // Add buttons
  // -----------------------------------------------------------------------
  btnAddMember.addEventListener('click', function () { openMemberForm(null); });
  btnAddEvent.addEventListener('click', function () { openTimelineForm(null); });

  // -----------------------------------------------------------------------
  // Save buttons
  // -----------------------------------------------------------------------
  if (btnSaveMembers) {
    btnSaveMembers.addEventListener('click', saveMembers);
  }
  if (btnSaveTimeline) {
    btnSaveTimeline.addEventListener('click', saveTimeline);
  }

  // -----------------------------------------------------------------------
  // Init — called by auth IIFE after password verification
  // -----------------------------------------------------------------------
  function initAdmin() {
    loadMembers();
    loadTimeline();
    loadSettings();
  }

  window.initAdmin = initAdmin;
})();
