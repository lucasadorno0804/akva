/**
 * Tema dos protótipos: segue o sistema (automático) ou a escolha salva (claro/escuro).
 * Carregado no <head>, antes da primeira pintura, para não piscar o tema errado.
 * O CSS de cada versão lê o atributo data-theme="light|dark" do <html>.
 */
(() => {
    const KEY = 'akva-theme';
    const root = document.documentElement;
    const systemLight = matchMedia('(prefers-color-scheme: light)');

    const read = () => {
        try {
            const saved = localStorage.getItem(KEY);
            return saved === 'light' || saved === 'dark' ? saved : 'auto';
        } catch {
            return 'auto';
        }
    };

    let choice = read();

    function apply() {
        const theme = choice === 'auto' ? (systemLight.matches ? 'light' : 'dark') : choice;
        root.dataset.theme = theme;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta && meta.dataset[theme]) meta.content = meta.dataset[theme];
        document.querySelectorAll('[data-theme-option]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.themeOption === choice));
        });
    }

    function choose(next) {
        if (next === choice) return;
        choice = next;
        try {
            if (choice === 'auto') localStorage.removeItem(KEY);
            else localStorage.setItem(KEY, choice);
        } catch {
            // Sem armazenamento (aba privada): a escolha vale só nesta página
        }
        // Esmaece entre os temas em vez de trocar tudo de uma vez
        if (document.startViewTransition) document.startViewTransition(apply);
        else apply();
    }

    apply();
    systemLight.addEventListener('change', () => {
        if (choice === 'auto') apply();
    });
    // As outras páginas abertas do protótipo acompanham a troca
    addEventListener('storage', (event) => {
        if (event.key !== KEY) return;
        choice = read();
        apply();
    });
    document.addEventListener('DOMContentLoaded', apply);

    // Menu de estilos do protótipo: fecha ao clicar fora ou com Esc
    document.addEventListener('click', (event) => {
        document.querySelectorAll('.style-switcher-menu[open]').forEach((menu) => {
            if (!menu.contains(event.target)) menu.open = false;
        });
    });
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        document.querySelectorAll('.style-switcher-menu[open]').forEach((menu) => {
            menu.open = false;
            menu.querySelector('summary').focus();
        });
    });
    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-theme-option]');
        if (button) choose(button.dataset.themeOption);
    });
})();
