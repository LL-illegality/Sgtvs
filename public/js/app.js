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

    members.forEach(function (member, index) {
      var card = document.createElement('div');
      card.className = 'member-card';
      card.setAttribute('data-scroll', '');

      var imgSrc = member.image || '';
      var imgHtml = imgSrc
        ? '<img src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(member.title) + '" class="member-card-img" />'
        : '<div class="member-card-img flex items-center justify-center text-stone-400 font-serif text-4xl">' + escapeHtml(member.title.charAt(0)) + '</div>';

      card.innerHTML =
        imgHtml +
        '<div class="member-card-body">' +
        '<h3 class="member-name font-serif text-xl text-stone-800 mb-1">' +
        escapeHtml(member.title) +
        '</h3>' +
        '<p class="member-role">' +
        escapeHtml(member.subtitle) +
        '</p>' +
        '<p class="member-desc">' +
        escapeHtml(member.description) +
        '</p>' +
        '</div>';

      membersGrid.appendChild(card);
    });

    setTimeout(handleScrollEffects, 100);
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

  function init() {
    fetchMembers();
    fetchTimeline();

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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
