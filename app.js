// ===== fishinglog.ai — app.js =====

// Nav scroll shadow
(function () {
  var nav = document.getElementById('nav');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 10) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }, { passive: true });
})();

// Close mobile nav on link click
(function () {
  var nav = document.getElementById('nav');
  var links = nav.querySelectorAll('.nav-links a');
  links.forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('open');
    });
  });
})();

// Intersection Observer for fade-up animations
(function () {
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.feature-card, .price-card, .arch-step').forEach(function (el) {
    observer.observe(el);
  });
})();

// Beta signup form
(function () {
  var form = document.getElementById('signup-form');
  if (!form) return;

  var success = document.getElementById('form-success');
  var error = document.getElementById('form-error');
  var btn = form.querySelector('button[type="submit"]');
  var btnText = btn.textContent;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = form.querySelector('#name').value.trim();
    var email = form.querySelector('#email').value.trim();
    var anglerType = form.querySelector('#angler-type').value;

    if (!name || !email) {
      showError('Please fill in your name and email.');
      return;
    }

    // Email validation
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      showError('Please enter a valid email address.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Submitting...';
    success.style.display = 'none';
    error.style.display = 'none';

    // POST to Cloudflare Worker
    fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        email: email,
        anglerType: anglerType,
        source: 'fishinglog.ai',
        timestamp: new Date().toISOString()
      })
    })
      .then(function (res) {
        if (res.ok) {
          success.style.display = 'block';
          form.reset();
        } else {
          throw new Error('Server error');
        }
      })
      .catch(function () {
        // Fallback: try mailto
        error.style.display = 'block';
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = btnText;
      });
  });

  function showError(msg) {
    error.textContent = '❌ ' + msg;
    error.style.display = 'block';
  }
})();
