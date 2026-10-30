/**
 * AKVAPromo Liquid Glass Interactions & Parallax Engine
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Navbar Scroll Blur Elevation (as cores ficam no CSS, para funcionar nos dois temas)
    const header = document.querySelector('.fixed-nav');
    const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 40);
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();

    // 2. Liquid Parallax for Ambient Mesh & Glow Spots
    let ticking = false;
    const ribbonMesh = document.querySelector('.liquid-ribbon-mesh');
    const glowSpots = document.querySelectorAll('.glow-spot');

    document.addEventListener('mousemove', (e) => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const normX = (e.clientX / window.innerWidth) - 0.5;
                const normY = (e.clientY / window.innerHeight) - 0.5;

                // Subtle mesh drift
                if (ribbonMesh) {
                    ribbonMesh.style.transform = `scale(1.02) translate(${normX * 10}px, ${normY * 10}px)`;
                }

                // Ambient glow spots movement
                glowSpots.forEach((spot, i) => {
                    const factor = (i + 1) * 16;
                    spot.style.transform = `translate(${normX * factor}px, ${normY * factor}px)`;
                });

                ticking = false;
            });
            ticking = true;
        }
    });

    // 3. Liquid Glass 3D Specular Tilt on Cards
    const cards = document.querySelectorAll('.card.liquid-glass');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -4;
            const rotateY = ((x - centerX) / centerX) * 4;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)';
        });
    });

    // 4. Smooth Scroll for Nav Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || !targetId) return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 5. Dynamic Deal Scarcity Simulator
    const updateScarcity = () => {
        document.querySelectorAll('.bar-fill').forEach(fill => {
            const currentWidth = parseFloat(fill.style.width || '70%');
            if (currentWidth > 6) {
                const drop = Math.random() * 0.35;
                const newWidth = Math.max(5, (currentWidth - drop));
                fill.style.width = newWidth + '%';
            }
        });
    };

    setInterval(updateScarcity, 5000);

    // 6. Interactive Hero Search Filter
    const searchInput = document.querySelector('.hero-search input');
    const searchBtn = document.querySelector('.hero-search button');
    const productCards = document.querySelectorAll('#deals-grid .card');

    const handleSearch = () => {
        const query = (searchInput?.value || '').toLowerCase().trim();
        productCards.forEach(card => {
            const title = (card.querySelector('.product-title')?.textContent || '').toLowerCase();
            if (!query || title.includes(query)) {
                card.style.display = 'flex';
                card.style.opacity = '1';
            } else {
                card.style.display = 'none';
            }
        });
    };

    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }

    // 7. Mobile Drawer Navigation Toggle (Touch-First)
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileDrawer = document.querySelector('.mobile-drawer');

    if (mobileMenuBtn && mobileDrawer) {
        const toggleDrawer = () => {
            const isOpen = mobileDrawer.classList.toggle('open');
            mobileMenuBtn.classList.toggle('active');
            mobileMenuBtn.setAttribute('aria-expanded', isOpen);
            mobileDrawer.setAttribute('aria-hidden', !isOpen);
            document.body.style.overflow = isOpen ? 'hidden' : '';
        };

        mobileMenuBtn.addEventListener('click', toggleDrawer);

        // Close drawer when a link is tapped
        mobileDrawer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileDrawer.classList.remove('open');
                mobileMenuBtn.classList.remove('active');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                mobileDrawer.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
            });
        });
    }
});
