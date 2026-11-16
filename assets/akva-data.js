/**
 * AKVAPromo · dados de exemplo compartilhados pelos protótipos (Apple, Encarte, Terminal).
 * Cupons, preços e horários são fictícios. As fotos do Unsplash ocupam o lugar
 * das fotos reais dos produtos (que normalmente vêm com fundo branco da loja).
 */
(() => {
    const unsplash = (id) => `https://images.unsplash.com/photo-${id}?w=720&h=720&fit=crop&q=75&auto=format`;

    window.AKVA = {
        stores: {
            amazon: { name: 'Amazon', article: 'a', url: 'https://www.amazon.com.br/?tag=abacatefrito7-20', affiliateTag: 'abacatefrito7-20' },
            mercadolivre: { name: 'Mercado Livre', article: 'o', url: 'https://www.mercadolivre.com.br/' },
            aliexpress: { name: 'AliExpress', article: 'o', url: 'https://pt.aliexpress.com/' },
        },

        categories: {
            all: { name: 'Todos os loots', icon: '⚡' },
            games: { name: 'Games & Consoles', icon: '🎮' },
            hardware: { name: 'Hardware & Peças', icon: '⚡' },
            outros: { name: 'Periféricos & Outros', icon: '🎧' },
        },

        // Pilha do topo, de trás para frente. O último fica inteiro à vista, em vermelho.
        heroCoupons: ['ali-40', 'ml-games15', 'amz-ele50'],

        coupons: [
            {
                id: 'amz-ele50', store: 'amazon', category: 'hardware', value: 'R$ 50 OFF', condition: 'em eletrônicos e hardware acima de R$ 500',
                code: 'AKVA50', until: '30/11', untilFull: '30/11/2026, 23h59', minimum: 'R$ 500',
                scope: 'Eletrônicos vendidos e entregues pela Amazon', limit: '1 uso por conta', tested: 'há 12 min',
            },
            {
                id: 'ml-games15', store: 'mercadolivre', category: 'games', value: '15% OFF', condition: 'em games e consoles, até R$ 300',
                code: 'AKVAGAMER15', until: '20/11', untilFull: '20/11/2026, 23h59', minimum: 'R$ 200',
                scope: 'Games, consoles e acessórios', limit: 'Desconto máximo de R$ 300', tested: 'há 20 min',
            },
            {
                id: 'ali-40', store: 'aliexpress', category: 'outros', value: 'R$ 40 OFF', condition: 'em compras acima de R$ 280',
                code: 'AKVA40', until: '11/11', untilFull: '11/11/2026, 23h59', minimum: 'R$ 280',
                scope: 'Produtos com o selo Choice', limit: '1 uso por conta', tested: 'há 35 min',
            },
            {
                id: 'amz-app10', store: 'amazon', category: 'games', value: '10% OFF', condition: 'na primeira compra pelo app, até R$ 60',
                code: 'AKVAAPP10', until: '31/12', untilFull: '31/12/2026, 23h59', minimum: 'Sem mínimo',
                scope: 'Primeira compra feita no app da Amazon', limit: 'Desconto máximo de R$ 60', tested: 'há 3 h',
            },
            {
                id: 'ml-frete', store: 'mercadolivre', category: 'hardware', value: 'Frete grátis', condition: 'em compras acima de R$ 79',
                code: 'AKVAFRETE', until: '30/11', untilFull: '30/11/2026, 23h59', minimum: 'R$ 79',
                scope: 'Produtos com envio pelo Mercado Livre', limit: '3 usos por conta', tested: 'há 5 h',
            },
            {
                id: 'ali-100', store: 'aliexpress', category: 'hardware', value: 'R$ 100 OFF', condition: 'em compras acima de R$ 700',
                code: 'AKVA100', until: '11/11', untilFull: '11/11/2026, 23h59', minimum: 'R$ 700',
                scope: 'Lojas oficiais participantes', limit: '1 uso por conta', tested: 'há 6 h',
            },
        ],

        deals: [
            // --- GAMES ---
            {
                id: 'ps5-slim', store: 'amazon', category: 'games', featured: true,
                title: 'PlayStation 5 Slim Edição Digital + 2 Jogos',
                blurb: 'Console PlayStation 5 Slim com design compacto, 1TB SSD e jogos inclusos.',
                price: 3719.07, was: 4599.90, image: 'assets/img/play_5_astrobot_ft0fs28ce5.webp', fit: 'contain',
                url: 'https://www.amazon.com.br/dp/B0D189Y4ZP', checked: 'há 10 min',
                coupon: { code: 'AKVA50', price: 3669.07 },
            },
            {
                id: 'nintendo-switch-oled', store: 'amazon', category: 'games',
                title: 'Console Nintendo Switch OLED 64GB - Branco',
                price: 2099.00, was: 2699.00, image: unsplash('1578303512597-81e6cc155b3e'), fit: 'cover',
                url: 'https://www.amazon.com.br/dp/B098RKWHHZ', checked: 'há 20 min',
            },
            {
                id: 'xbox-controller', store: 'mercadolivre', category: 'games',
                title: 'Controle sem fio Xbox, Robot White',
                price: 359.90, was: 499.00, image: unsplash('1600080972464-8e5f35f63d08'), fit: 'cover', checked: 'há 40 min',
                coupon: { code: 'AKVAGAMER15', price: 305.92 },
            },
            {
                id: 'dualsense-ps5', store: 'amazon', category: 'games',
                title: 'Controle sem fio PlayStation DualSense - Midnight Black',
                price: 419.00, was: 499.90, image: unsplash('1607604276583-eef5d076aa5f'), fit: 'cover',
                url: 'https://www.amazon.com.br/dp/B094WL86N5', checked: 'há 25 min',
            },
            {
                id: 'game-astrobot', store: 'amazon', category: 'games',
                title: 'Jogo Astro Bot - PlayStation 5 (Mídia Física)',
                price: 249.90, was: 349.90, image: unsplash('1550745165-9bc0b252726f'), fit: 'cover',
                url: 'https://www.amazon.com.br/dp/B0D5Z5G12M', checked: 'há 30 min',
            },

            // --- HARDWARE ---
            {
                id: 'rtx4070s', store: 'mercadolivre', category: 'hardware', featured: true,
                title: 'Placa de vídeo GeForce RTX 4070 Super 12 GB GDDR6X',
                blurb: '12 GB GDDR6X e DLSS 3. Feita para jogar em 1440p com tudo no ultra.',
                price: 4090.00, was: 4799.90, image: 'assets/img/rtx4070.png', fit: 'cover', checked: 'há 18 min',
            },
            {
                id: 'ryzen-5700x3d', store: 'amazon', category: 'hardware',
                title: 'Processador AMD Ryzen 7 5700X3D, 8-Core 16-Threads, 4.1GHz Turbo',
                price: 1349.00, was: 1899.00, image: unsplash('1591799264318-7e6ef8ddb7ea'), fit: 'cover',
                url: 'https://www.amazon.com.br/dp/B0CQ4H4H7X', checked: 'há 15 min',
            },
            {
                id: 'ssd-kingston-nv3', store: 'amazon', category: 'hardware',
                title: 'SSD Kingston NV3 1TB M.2 2280 NVMe PCIe 4.0 (Até 6000MB/s)',
                price: 429.90, was: 599.00, image: unsplash('1587202372775-e229f172b9d7'), fit: 'cover',
                url: 'https://www.amazon.com.br/dp/B0DB56BC8T', checked: 'há 12 min',
            },
            {
                id: 'ram-corsair', store: 'amazon', category: 'hardware',
                title: 'Memória RAM Corsair Vengeance LPX 16GB (2x8GB) DDR4 3200MHz',
                price: 289.90, was: 429.00, image: unsplash('1518770660439-4636190af475'), fit: 'cover',
                url: 'https://www.amazon.com.br/dp/B0143UM4TC', checked: 'há 45 min',
            },
            {
                id: 'fonte-msi', store: 'amazon', category: 'hardware',
                title: 'Fonte MSI MAG A650BN, 650W, 80 Plus Bronze, PFC Ativo',
                price: 299.90, was: 399.00, image: unsplash('1587829741301-dc798b83add3'), fit: 'cover',
                url: 'https://www.amazon.com.br/dp/B0991TZ399', checked: 'há 50 min',
            },

            // --- OUTROS & PERIFÉRICOS ---
            {
                id: 'monitor-lg-ultragear', store: 'amazon', category: 'outros',
                title: 'Monitor Gamer LG UltraGear 24" IPS FHD 144Hz 1ms HDR10',
                price: 829.00, was: 1199.00, image: unsplash('1527443224154-c4a3942d3acf'), fit: 'cover',
                url: 'https://www.amazon.com.br/dp/B09XN5B12Q', checked: 'há 35 min',
            },
            {
                id: 'mouse-logitech-g502', store: 'amazon', category: 'outros',
                title: 'Mouse Gamer Logitech G502 HERO 25.600 DPI com Pesos Ajustáveis',
                price: 279.90, was: 449.90, image: unsplash('1615663245857-ac93bb7c39e7'), fit: 'cover',
                url: 'https://www.amazon.com.br/dp/B07GBZ4Q68', checked: 'há 1 h',
            },
            {
                id: 'headset-hyperx', store: 'amazon', category: 'outros',
                title: 'Headset Gamer HyperX Cloud Stinger 2 Core com Drivers de 40mm',
                price: 199.90, was: 349.90, image: unsplash('1505740420928-5e560c06d30e'), fit: 'cover',
                url: 'https://www.amazon.com.br/dp/B0B8K3P78H', checked: 'há 40 min',
            },
            {
                id: 'keychron', store: 'aliexpress', category: 'outros',
                title: 'Teclado mecânico Keychron K2 Pro, layout 75% Custom RGB',
                price: 589.90, was: 899.00, image: unsplash('1618384887929-16ec33fab9ef'), fit: 'cover', checked: 'há 2 h',
            },
            {
                id: 'echo', store: 'amazon', category: 'outros',
                title: 'Smart speaker Echo Pop com Som compacto e Alexa',
                price: 236.55, was: 349.00, image: unsplash('1543512214-318c7553f230'), fit: 'cover',
                url: 'https://www.amazon.com.br/dp/B09ZX554KW', checked: 'há 1 h',
            },
        ],
    };
})();
