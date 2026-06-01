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

    /* ===== ANIMATED ALERTS (SWEETALERT2) ===== */
    function initAutoAlerts() {
        var alerts = document.querySelectorAll('.alert-gas');
        if (alerts.length === 0) return;

        // Check if SweetAlert2 is loaded, otherwise load dynamically
        if (typeof Swal === 'undefined') {
            const swalScript = document.createElement('script');
            swalScript.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
            swalScript.onload = function() {
                triggerSweetAlerts(alerts);
            };
            document.head.appendChild(swalScript);
        } else {
            triggerSweetAlerts(alerts);
        }
    }

    function triggerSweetAlerts(alerts) {
        alerts.forEach(function(alert) {
            // Only convert flash/dismissible alerts into popups
            if (!alert.classList.contains('alert-dismissible')) return;

            var alertClone = alert.cloneNode(true);
            var btnClose = alertClone.querySelector('.btn-close');
            if (btnClose) btnClose.remove();
            var icon = alertClone.querySelector('.bi');
            if (icon) icon.remove();
            var text = alertClone.textContent.trim();

            var iconType = 'info';
            if (alert.classList.contains('alert-gas-success')) {
                iconType = 'success';
            } else if (alert.classList.contains('alert-gas-danger')) {
                iconType = 'error';
            } else if (alert.classList.contains('alert-gas-warning')) {
                iconType = 'warning';
            }

            // Hide original element
            alert.style.display = 'none';

            // Trigger Premium Centered Dialog
            Swal.fire({
                icon: iconType,
                title: iconType === 'success' ? 'Berhasil' : (iconType === 'error' ? 'Gagal' : 'Peringatan'),
                text: text,
                showConfirmButton: true,
                confirmButtonText: 'Selesai',
                confirmButtonColor: iconType === 'success' ? '#10b981' : (iconType === 'error' ? '#ef4444' : '#f59e0b'),
                background: '#ffffff',
                customClass: {
                    popup: 'swal2-premium-popup shadow-xl'
                },
                buttonsStyling: true
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
