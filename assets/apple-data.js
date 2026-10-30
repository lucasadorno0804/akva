/**
 * AKVAPromo · protótipo Apple: dados de exemplo.
 * Cupons, preços e horários são fictícios. As fotos do Unsplash ocupam o lugar
 * das fotos reais dos produtos (que normalmente vêm com fundo branco da loja).
 */
(() => {
    const unsplash = (id) => `https://images.unsplash.com/photo-${id}?w=720&h=720&fit=crop&q=75&auto=format`;

    window.AKVA = {
        stores: {
            amazon: { name: 'Amazon', article: 'a', url: 'https://www.amazon.com.br/' },
            mercadolivre: { name: 'Mercado Livre', article: 'o', url: 'https://www.mercadolivre.com.br/' },
            aliexpress: { name: 'AliExpress', article: 'o', url: 'https://pt.aliexpress.com/' },
        },

        // Pilha do topo, de trás para frente. O último fica inteiro à vista, em vermelho.
        heroCoupons: ['ali-40', 'ml-games15', 'amz-ele50'],

        coupons: [
            {
                id: 'amz-ele50', store: 'amazon', value: 'R$ 50 OFF', condition: 'em eletrônicos acima de R$ 500',
                code: 'AKVA50', until: '30/11', untilFull: '30/11/2026, 23h59', minimum: 'R$ 500',
                scope: 'Eletrônicos vendidos e entregues pela Amazon', limit: '1 uso por conta', tested: 'há 12 min',
            },
            {
                id: 'ml-games15', store: 'mercadolivre', value: '15% OFF', condition: 'em games e consoles, até R$ 300',
                code: 'AKVAGAMER15', until: '20/11', untilFull: '20/11/2026, 23h59', minimum: 'R$ 200',
                scope: 'Games, consoles e acessórios', limit: 'Desconto máximo de R$ 300', tested: 'há 20 min',
            },
            {
                id: 'ali-40', store: 'aliexpress', value: 'R$ 40 OFF', condition: 'em compras acima de R$ 280',
                code: 'AKVA40', until: '11/11', untilFull: '11/11/2026, 23h59', minimum: 'R$ 280',
                scope: 'Produtos com o selo Choice', limit: '1 uso por conta', tested: 'há 35 min',
            },
            {
                id: 'amz-livros20', store: 'amazon', value: 'R$ 20 OFF', condition: 'em livros acima de R$ 120',
                code: 'AKVALIVROS', until: '15/11', untilFull: '15/11/2026, 23h59', minimum: 'R$ 120',
                scope: 'Livros físicos vendidos pela Amazon', limit: '1 uso por conta', tested: 'há 1 h',
            },
            {
                id: 'ml-casa30', store: 'mercadolivre', value: 'R$ 30 OFF', condition: 'em casa e decoração acima de R$ 249',
                code: 'AKVACASA30', until: '10/11', untilFull: '10/11/2026, 23h59', minimum: 'R$ 249',
                scope: 'Casa, móveis e decoração', limit: '1 uso por conta', tested: 'há 2 h',
            },
            {
                id: 'ali-novo15', store: 'aliexpress', value: 'R$ 15 OFF', condition: 'na primeira compra no AliExpress',
                code: 'AKVANOVO15', until: '31/12', untilFull: '31/12/2026, 23h59', minimum: 'R$ 60',
                scope: 'Contas sem compras anteriores', limit: '1 uso por conta', tested: 'há 4 h',
            },
            {
                id: 'amz-app10', store: 'amazon', value: '10% OFF', condition: 'na primeira compra pelo app, até R$ 60',
                code: 'AKVAAPP10', until: '31/12', untilFull: '31/12/2026, 23h59', minimum: 'Sem mínimo',
                scope: 'Primeira compra feita no app da Amazon', limit: 'Desconto máximo de R$ 60', tested: 'há 3 h',
            },
            {
                id: 'ml-frete', store: 'mercadolivre', value: 'Frete grátis', condition: 'em compras acima de R$ 79',
                code: 'AKVAFRETE', until: '30/11', untilFull: '30/11/2026, 23h59', minimum: 'R$ 79',
                scope: 'Produtos com envio pelo Mercado Livre', limit: '3 usos por conta', tested: 'há 5 h',
            },
            {
                id: 'ali-100', store: 'aliexpress', value: 'R$ 100 OFF', condition: 'em compras acima de R$ 700',
                code: 'AKVA100', until: '11/11', untilFull: '11/11/2026, 23h59', minimum: 'R$ 700',
                scope: 'Lojas oficiais participantes', limit: '1 uso por conta', tested: 'há 6 h',
            },
        ],

        deals: [
            {
                id: 'rtx4070s', store: 'mercadolivre', featured: true,
                title: 'Placa de vídeo GeForce RTX 4070 Super 12 GB',
                blurb: '12 GB GDDR6X e DLSS 3. Feita para jogar em 1440p com tudo no máximo.',
                price: 4090.00, was: 4799.90, image: 'assets/img/rtx4070.png', fit: 'cover', checked: 'há 18 min',
            },
            {
                id: 'ps5-slim', store: 'amazon',
                title: 'PlayStation 5 Slim Digital + Astro Bot + Gran Turismo 7',
                price: 3719.07, was: 4599.90, image: 'assets/img/play_5_astrobot_ft0fs28ce5.webp', fit: 'contain',
                url: 'https://amzn.to/4vyqn2X', checked: 'há 25 min', coupon: { code: 'AKVA50', price: 3669.07 },
            },
            {
                id: 'echo', store: 'amazon',
                title: 'Smart speaker Echo com Alexa',
                price: 474.05, was: 799.00, image: unsplash('1543512214-318c7553f230'), fit: 'cover', checked: 'há 1 h',
            },
            {
                id: 'xbox-controller', store: 'mercadolivre',
                title: 'Controle sem fio Xbox, Robot White',
                price: 359.90, was: 499.00, image: unsplash('1600080972464-8e5f35f63d08'), fit: 'cover', checked: 'há 40 min',
                coupon: { code: 'AKVAGAMER15', price: 305.92 },
            },
            {
                id: 'keychron', store: 'aliexpress',
                title: 'Teclado mecânico Keychron K2 Pro, layout 75%',
                price: 589.90, was: 899.00, image: unsplash('1618384887929-16ec33fab9ef'), fit: 'cover', checked: 'há 2 h',
            },
            {
                id: 'apple-watch', store: 'amazon',
                title: 'Apple Watch SE (2ª geração), GPS, 40 mm',
                price: 1899.00, was: 2599.00, image: unsplash('1546868871-7041f2a55e12'), fit: 'cover', checked: 'há 3 h',
            },
            {
                id: 'jbl-flip', store: 'mercadolivre',
                title: 'Caixa de som JBL Flip 6, à prova d’água',
                price: 579.00, was: 899.00, image: unsplash('1608043152269-423dbba4e7e1'), fit: 'cover', checked: 'há 2 h',
            },
            {
                id: 'earbuds', store: 'aliexpress',
                title: 'Fones sem fio com cancelamento de ruído',
                price: 149.90, was: 349.00, image: unsplash('1590658268037-6bf12165a8df'), fit: 'cover', checked: 'há 4 h',
            },
            {
                id: 'smartwatch', store: 'aliexpress',
                title: 'Smartwatch redondo com tela AMOLED',
                price: 299.90, was: 549.00, image: unsplash('1523275335684-37898b6baf30'), fit: 'cover', checked: 'há 5 h',
            },
        ],
    };
})();
