/**
 * AKVAPromo Premium Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Header Scroll Effect
    const header = document.querySelector('.fixed-nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.background = 'rgba(6, 6, 6, 0.8)';
            header.style.backdropFilter = 'blur(20px)';
            header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
        } else {
            header.style.background = 'transparent';
            header.style.backdropFilter = 'none';
            header.style.borderBottom = 'none';
        }
    });

    // 2. Intersection Observer for Scroll Animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const revealElement = (el) => {
        el.classList.add('animate-fade-up');
        el.style.opacity = '1';
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                revealElement(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatableElements = document.querySelectorAll('.card, .section-header, .banner-group, .hero-content > *');
    
    animatableElements.forEach(el => {
        el.style.opacity = '0'; // Initial state for animation
        observer.observe(el);
    });

    // Safety reveal after 1.5s in case scroll observer misses them
    setTimeout(() => {
        animatableElements.forEach(el => {
            if (el.style.opacity === '0') revealElement(el);
        });
    }, 1500);

    // 3. Smooth Scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 4. Dynamic Deal Updates (Mock for premium feel)
    const updateScarcity = () => {
        document.querySelectorAll('.bar-fill').forEach(bar => {
            const currentWidthStr = bar.style.width || '70%';
            const currentWidth = parseFloat(currentWidthStr);
            if (currentWidth > 5) {
                const drop = Math.random() * 0.3;
                bar.style.width = (currentWidth - drop) + '%';
            }
        });
    };

    setInterval(updateScarcity, 5000);

    // 5. Mouse Parallax for Glow Spots
    let ticking = false;
    document.addEventListener('mousemove', (e) => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const spots = document.querySelectorAll('.glow-spot');
                const x = e.clientX / window.innerWidth;
                const y = e.clientY / window.innerHeight;

                spots.forEach((spot, index) => {
                    const speed = (index + 1) * 15;
                    const moveX = (x - 0.5) * speed;
                    const moveY = (y - 0.5) * speed;
                    spot.style.transform = `translate(${moveX}px, ${moveY}px)`;
                });
                ticking = false;
            });
            ticking = true;
        }
    });
});
