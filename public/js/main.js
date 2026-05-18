(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        initSidebar();
        initScrollReveal();
        initAutoAlerts();
        initTooltips();
    });

    /* ===== SIDEBAR TOGGLE ===== */
    function initSidebar() {
        const toggleBtn = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const mainContent = document.querySelector('.main-content');

        if (!toggleBtn || !sidebar) return;

        function toggleSidebar() {
            if (window.innerWidth <= 991) {
                sidebar.classList.toggle('show');
                if (overlay) overlay.classList.toggle('show');
            } else {
                sidebar.classList.toggle('collapsed');
                if (mainContent) mainContent.classList.toggle('expanded');
            }
        }

        function closeSidebar() {
            if (window.innerWidth <= 991) {
                sidebar.classList.remove('show');
                if (overlay) overlay.classList.remove('show');
            }
        }

        toggleBtn.addEventListener('click', toggleSidebar);
        if (overlay) overlay.addEventListener('click', closeSidebar);

        window.addEventListener('resize', function() {
            if (window.innerWidth > 991) {
                if (overlay) overlay.classList.remove('show');
            } else {
                sidebar.classList.remove('collapsed');
                if (mainContent) mainContent.classList.remove('expanded');
            }
        });
    }

    /* ===== SCROLL REVEAL (INTERSECTION OBSERVER) ===== */
    function initScrollReveal() {
        var revealSelectors = [
            '.reveal', '.reveal-left', '.reveal-right', '.reveal-scale',
            '.reveal-stagger'
        ];
        var elements = document.querySelectorAll(revealSelectors.join(','));

        if (elements.length === 0) return;

        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            elements.forEach(function(el) {
                observer.observe(el);
            });
        } else {
            elements.forEach(function(el) {
                el.classList.add('visible');
            });
        }
    }

    /* ===== ANIMATED ALERTS ===== */
    function initAutoAlerts() {
        var alerts = document.querySelectorAll('.alert-dismissible');
        alerts.forEach(function(alert) {
            var autoDismiss = alert.getAttribute('data-auto-dismiss');
            var delay = autoDismiss ? parseInt(autoDismiss) : 5000;

            setTimeout(function() {
                if (alert && alert.parentNode) {
                    alert.classList.add('alert-dismissing');
                    setTimeout(function() {
                        if (alert && alert.parentNode) {
                            var bsAlert = new bootstrap.Alert(alert);
                            bsAlert.close();
                        }
                    }, 300);
                }
            }, delay);
        });

        document.querySelectorAll('.alert-gas .btn-close').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                var alert = this.closest('.alert-gas');
                if (alert) {
                    e.preventDefault();
                    alert.classList.add('alert-dismissing');
                    setTimeout(function() {
                        var bsAlert = new bootstrap.Alert(alert);
                        bsAlert.close();
                    }, 300);
                }
            });
        });
    }

    /* ===== BOOTSTRAP TOOLTIPS ===== */
    function initTooltips() {
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function(el) {
            return new bootstrap.Tooltip(el);
        });
    }

})();
