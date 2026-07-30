(function () {
  'use strict';

  const membersGrid = document.getElementById('members-grid');
  const timelineContainer = document.getElementById('timeline-container');

  async function fetchMembers() {
    try {
      const res = await fetch('/api/members');
      if (!res.ok) throw new Error('Failed to fetch members');
      const data = await res.json();
      data.sort(function (a, b) { return a.order - b.order; });
      renderMembers(data);
    } catch (err) {
      console.error('Error loading members:', err);
      if (membersGrid) {
        membersGrid.innerHTML =
          '<p class="text-stone-500 col-span-full text-center py-8">成员数据暂未加载成功，请稍后刷新页面。</p>';
      }
    }
  }

  async function fetchTimeline() {
    try {
      const res = await fetch('/api/timeline');
      if (!res.ok) throw new Error('Failed to fetch timeline');
      const data = await res.json();
      data.sort(function (a, b) { return b.date.localeCompare(a.date); });
      renderTimeline(data);
    } catch (err) {
      console.error('Error loading timeline:', err);
      if (timelineContainer) {
        timelineContainer.innerHTML =
          '<p class="text-stone-500 text-center py-8">大事年表数据暂未加载成功，请稍后刷新页面。</p>';
      }
    }
  }

  /* ---------- Render members (image + text card) ---------- */
  function renderMembers(members) {
    if (!membersGrid) return;
    membersGrid.innerHTML = '';

    members.forEach(function (member) {
      var wrapper = document.createElement('div');
      wrapper.className = 'member-card-wrapper';
      wrapper.setAttribute('data-scroll', '');

      var card = document.createElement('div');
      var showDesc = member.showDescription !== false;
      var clickAction = member.clickAction || 'none';
      card.className = 'member-card' + (clickAction !== 'none' ? ' member-card--clickable' : '');

      var imgSrc = member.image || '';
      var imgHtml = imgSrc
        ? '<img src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(member.title) + '" class="member-card-img" />'
        : '<div class="member-card-img flex items-center justify-center text-stone-400 font-serif text-4xl">' + escapeHtml(member.title.charAt(0)) + '</div>';

      var descHtml = showDesc && member.description
        ? '<p class="member-desc">' + escapeHtml(member.description) + '</p>'
        : '';

      card.innerHTML =
        imgHtml +
        '<div class="member-card-body' + (showDesc ? '' : ' member-card-body--no-desc') + '">' +
        '<h3 class="member-name font-serif text-xl text-stone-800 mb-1">' +
        escapeHtml(member.title) +
        '</h3>' +
        '<p class="member-role">' +
        escapeHtml(member.subtitle) +
        '</p>' +
        descHtml +
        '</div>';

      // Click behavior
      if (clickAction !== 'none') {
        card.addEventListener('click', function (e) {
          if (clickAction === 'detail') {
            openDetailModal(member);
          } else if (clickAction === 'scroll') {
            var target = document.querySelector(member.clickActionValue);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth' });
            }
          } else if (clickAction === 'link') {
            if (member.clickActionValue) {
              window.open(member.clickActionValue, '_blank');
            }
          }
        });
      }

      wrapper.appendChild(card);
      membersGrid.appendChild(wrapper);
    });

    scaleMembersGrid();
    setTimeout(handleScrollEffects, 100);
  }

  /* ---------- Scale members to fit proportionally ---------- */
  function scaleMembersGrid() {
    var wrappers = membersGrid.querySelectorAll('.member-card-wrapper');
    if (wrappers.length === 0) return;

    var containerWidth = membersGrid.clientWidth;
    if (containerWidth === 0) return;
    var gap = 16;
    var cellWidth = (containerWidth - gap * 2) / 3;
    var designWidth = 280;
    var scale = Math.min(cellWidth / designWidth, 1);

    for (var r = 0; r < wrappers.length; r += 3) {
      var rowMax = 0;
      for (var c = 0; c < 3 && r + c < wrappers.length; c++) {
        var wrapper = wrappers[r + c];
        var card = wrapper.querySelector('.member-card');
        if (card) {
          card.style.height = '';
          card.style.transform = 'none';
          rowMax = Math.max(rowMax, card.offsetHeight);
        }
      }
      for (var c = 0; c < 3 && r + c < wrappers.length; c++) {
        var wrapper = wrappers[r + c];
        var card = wrapper.querySelector('.member-card');
        if (!card) return;
        card.style.height = rowMax + 'px';
        card.style.transform = 'scale(' + scale + ')';
        wrapper.style.height = (rowMax * scale) + 'px';
        wrapper.classList.toggle('justify-self-center', scale >= 1);
      }
    }
  }

  /* ---------- Detail modal ---------- */
  var detailModalOverlay = null;

  function openDetailModal(member) {
    if (!detailModalOverlay) {
      detailModalOverlay = document.createElement('div');
      detailModalOverlay.className = 'detail-modal-overlay';
      detailModalOverlay.addEventListener('click', function (e) {
        if (e.target === detailModalOverlay) {
          closeDetailModal();
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.keyCode === 27 && detailModalOverlay && detailModalOverlay.style.display !== 'none') {
          closeDetailModal();
        }
      });
      document.body.appendChild(detailModalOverlay);
    }

    var imgHtml = member.image
      ? '<img src="' + escapeHtml(member.image) + '" alt="' + escapeHtml(member.title) + '" class="detail-modal-img" />'
      : '<div class="detail-modal-img flex items-center justify-center text-stone-400 font-serif text-4xl">' + escapeHtml(member.title.charAt(0)) + '</div>';

    detailModalOverlay.innerHTML =
      '<div class="detail-modal">' +
        '<button class="detail-modal-close">' +
          '<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>' +
        '</button>' +
        imgHtml +
        '<div class="detail-modal-body">' +
          '<h3 class="detail-modal-title">' + escapeHtml(member.title) + '</h3>' +
          '<p class="detail-modal-subtitle">' + escapeHtml(member.subtitle) + '</p>' +
          '<p class="detail-modal-text">' + escapeHtml(member.clickActionValue || member.description || '') + '</p>' +
        '</div>' +
      '</div>';

    detailModalOverlay.style.display = 'flex';
    requestAnimationFrame(function () {
      detailModalOverlay.classList.add('active');
    });

    var closeBtn = detailModalOverlay.querySelector('.detail-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeDetailModal);
    }
  }

  function closeDetailModal() {
    if (!detailModalOverlay) return;
    detailModalOverlay.classList.remove('active');
    setTimeout(function () {
      detailModalOverlay.style.display = 'none';
    }, 300);
  }

  /* ---------- Build card HTML (with optional link wrapping) ---------- */
  function buildCardHtml(event, type, yearStr) {
    var content = '';

    if (type === 'image-text') {
      var imgHtml = event.image
        ? '<img src="' + escapeHtml(event.image) + '" alt="' + escapeHtml(event.title) + '" class="timeline-card-img" />'
        : '<div class="timeline-card-img flex items-center justify-center text-stone-400 font-serif text-2xl">' + yearStr + '</div>';

      content =
        '<div class="timeline-card">' +
        imgHtml +
        '<span class="timeline-year">' + yearStr + '</span>' +
        '<h3 class="timeline-title font-serif text-lg md:text-xl text-stone-800 mb-2">' +
        escapeHtml(event.title) +
        '</h3>' +
        '<p class="text-sm text-stone-600 leading-relaxed">' +
        escapeHtml(event.shortDesc) +
        '</p>' +
        '</div>';
    } else {
      content =
        '<div class="timeline-card timeline-card-text">' +
        '<span class="timeline-year">' + yearStr + '</span>' +
        '<h3 class="timeline-title font-serif text-lg md:text-xl text-stone-800 mb-2">' +
        escapeHtml(event.title) +
        '</h3>' +
        '<p class="text-sm md:text-base text-stone-600 leading-relaxed">' +
        escapeHtml(event.detailDesc) +
        '</p>' +
        '</div>';
    }

    // Wrap in link if event.link exists
    if (event.link) {
      return '<a href="' + escapeHtml(event.link) + '" target="_blank" rel="noopener noreferrer" class="block no-underline hover:opacity-90 transition-opacity duration-500 ease-in-out">' + content + '</a>';
    }
    return content;
  }

  /* ---------- Calculate dynamic spacing between dates ---------- */
  function calculateSpacing(dateA, dateB) {
    var diffMs = Math.abs(dateB - dateA);
    var diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    var spacing;
    if (diffDays <= 30) {
      spacing = 2;
    } else if (diffDays <= 90) {
      spacing = 2.5;
    } else if (diffDays <= 180) {
      spacing = 3;
    } else if (diffDays <= 365) {
      spacing = 4;
    } else if (diffDays <= 730) {
      spacing = 5;
    } else {
      spacing = 6;
    }

    return spacing + 'rem';
  }

  /* ---------- Render timeline (cardType, link, dynamic spacing) ---------- */
  function renderTimeline(events) {
    if (!timelineContainer) return;
    timelineContainer.innerHTML = '';

    events.forEach(function (event, index) {
      var isLeft = index % 2 === 0;
      var node = document.createElement('div');
      node.className = 'timeline-node';
      node.setAttribute('data-scroll', '');

      var yearStr = event.date ? event.date.substring(0, 4) : '';

      // Build image card HTML (with optional link wrapping)
      var imageCardHtml = buildCardHtml(event, 'image-text', yearStr);
      // Build text card HTML (with optional link wrapping)
      var textCardHtml = buildCardHtml(event, 'text-only', yearStr);

      var cardType = event.cardType || 'both';

      if (cardType === 'image-text') {
        // Only show image card on the active side, empty on the other
        if (isLeft) {
          node.innerHTML =
            '<div class="timeline-side">' + imageCardHtml + '</div>' +
            '<div class="timeline-center"><div class="timeline-dot"></div></div>' +
            '<div class="timeline-side"></div>';
        } else {
          node.innerHTML =
            '<div class="timeline-side"></div>' +
            '<div class="timeline-center"><div class="timeline-dot"></div></div>' +
            '<div class="timeline-side">' + imageCardHtml + '</div>';
        }
      } else if (cardType === 'text-only') {
        // Only show text card on the active side
        if (isLeft) {
          node.innerHTML =
            '<div class="timeline-side">' + textCardHtml + '</div>' +
            '<div class="timeline-center"><div class="timeline-dot"></div></div>' +
            '<div class="timeline-side"></div>';
        } else {
          node.innerHTML =
            '<div class="timeline-side"></div>' +
            '<div class="timeline-center"><div class="timeline-dot"></div></div>' +
            '<div class="timeline-side">' + textCardHtml + '</div>';
        }
      } else {
        // both — show both sides (current behavior with alternating sides)
        if (isLeft) {
          node.innerHTML =
            '<div class="timeline-side">' + imageCardHtml + '</div>' +
            '<div class="timeline-center"><div class="timeline-dot"></div></div>' +
            '<div class="timeline-side">' + textCardHtml + '</div>';
        } else {
          node.innerHTML =
            '<div class="timeline-side">' + textCardHtml + '</div>' +
            '<div class="timeline-center"><div class="timeline-dot"></div></div>' +
            '<div class="timeline-side">' + imageCardHtml + '</div>';
        }
      }

      // Apply dynamic spacing
      if (index < events.length - 1) {
        var nextDate = new Date(events[index + 1].date);
        var currDate = new Date(event.date);
        var spacing = calculateSpacing(currDate, nextDate);
        node.style.marginBottom = spacing;
      }

      timelineContainer.appendChild(node);
    });

    setTimeout(handleScrollEffects, 100);
  }

  /* ---------- Bidirectional scroll effects (visible on enter, exit on leave) ---------- */
  function handleScrollEffects() {
    var els = document.querySelectorAll('[data-scroll]');
    var windowHeight = window.innerHeight;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var rect = el.getBoundingClientRect();
      var isVisible = rect.top < windowHeight * 0.88 && rect.bottom > 80;
      if (isVisible) {
        el.classList.add('visible');
        el.classList.remove('exit');
      } else {
        el.classList.remove('visible');
        el.classList.add('exit');
      }
    }
  }

  /* ---------- Parallax ---------- */
  function handleParallax() {
    var scrollY = window.scrollY;
    var els = document.querySelectorAll('[data-parallax]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.05;
      el.style.transform = 'translateY(' + (scrollY * speed) + 'px)';
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ---------- Settings / contact cards ---------- */
  var contactCardsContainer = document.getElementById('contact-cards');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function fetchSettings() {
    fetch('/api/settings').then(function (res) {
      if (!res.ok) throw new Error('Failed to load settings');
      return res.json();
    }).then(function (data) {
      renderContactCards(data);
    }).catch(function (err) {
      console.error('Error loading settings:', err);
    });
  }

  function renderContactCards(data) {
    if (!contactCardsContainer) return;
    var items = [
      { key: 'wechat', label: '现任台长微信', icon: 'chat', value: data.wechat || '', action: 'copy' },
      { key: 'officialAccount', label: '公众号 ID', icon: 'document', value: data.officialAccount || '', action: 'copy' },
      { key: 'videoChannel', label: '视频号昵称', icon: 'video', value: data.videoChannel || '', action: 'copy' },
      { key: 'bilibili', label: 'B 站账号', icon: 'tv', value: data.bilibili || '', action: 'link' }
    ];

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var iconSvg = '';
      if (item.icon === 'chat') {
        iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#8b9d77" stroke-width="1.5" width="28" height="28"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>';
      } else if (item.icon === 'document') {
        iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#8b9d77" stroke-width="1.5" width="28" height="28"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>';
      } else if (item.icon === 'video') {
        iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#8b9d77" stroke-width="1.5" width="28" height="28"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>';
      } else if (item.icon === 'tv') {
        iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#8b9d77" stroke-width="1.5" width="28" height="28"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>';
      }

      var displayValue = item.value || '待设置';
      var isEmpty = !item.value;

      html +=
        '<div class="contact-card' + (isEmpty ? ' contact-card--empty' : '') + '" data-key="' + item.key + '" data-action="' + item.action + '" data-value="' + escapeHtml(item.value) + '">' +
          '<div class="contact-card-icon">' + iconSvg + '</div>' +
          '<div class="contact-card-label">' + item.label + '</div>' +
          '<div class="contact-card-value">' + escapeHtml(displayValue) + '</div>' +
        '</div>';
    }

    contactCardsContainer.innerHTML = html;

    // Bind click events
    var cards = contactCardsContainer.querySelectorAll('.contact-card:not(.contact-card--empty)');
    for (var j = 0; j < cards.length; j++) {
      (function (card) {
        card.addEventListener('click', function () {
          var action = card.getAttribute('data-action');
          var value = card.getAttribute('data-value');
          if (action === 'copy' && value) {
            copyToClipboard(value);
          } else if (action === 'link' && value) {
            window.open('https://space.bilibili.com/' + value, '_blank');
          }
        });
      })(cards[j]);
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('已复制');
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('已复制');
    } catch (e) {
      // ignore
    }
    document.body.removeChild(textarea);
  }

  function showToast(msg) {
    if (!toastEl) return;
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastEl.classList.remove('visible');
    }
    toastEl.textContent = msg;
    toastEl.classList.add('visible');
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('visible');
      toastTimer = null;
    }, 1500);
  }

  function init() {
    fetchMembers();
    fetchTimeline();
    fetchSettings();

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          handleParallax();
          handleScrollEffects();
          ticking = false;
        });
        ticking = true;
      }
    });

    handleParallax();
    handleScrollEffects();

    var resizeTimer;
    window.addEventListener('resize', function () {
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
      resizeTimer = requestAnimationFrame(function () {
        scaleMembersGrid();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
