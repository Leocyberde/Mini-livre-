# Marketplace Regional - Mini Mercado Livre

Um marketplace completo e moderno para pequenos comércios locais, desenvolvido com React, TypeScript e Tailwind CSS. O projeto oferece três painéis distintos: **Cliente** (comprador), **Lojista** (vendedor) e **Administrador** (gerenciador da plataforma).

## 🎯 Características Principais

### Painel Cliente
- **Busca e Filtros**: Busca por nome de produto, filtro por categorias
- **Grid de Produtos**: Visualização elegante com informações de preço, rating e disponibilidade
- **Carrinho de Compras**: Adicionar/remover itens, ajustar quantidades
- **Checkout**: Formulário simples com nome e email
- **Histórico de Pedidos**: Acompanhamento de compras realizadas
- **Lojas em Destaque**: Visualização das lojas parceiras

### Painel Lojista
- **Dashboard de Vendas**: KPIs de vendas totais, pedidos e status
- **Gráficos**: Visualização de tendências de vendas e status de pedidos
- **Gestão de Pedidos**: Visualizar pedidos recebidos e atualizar status (Pendente → Enviado → Entregue)
- **Catálogo de Produtos**: Visualizar produtos da loja com opções de edição
- **Análise de Performance**: Dados detalhados de vendas e receita

### Painel Administrador
- **Visão Geral da Plataforma**: KPIs globais (vendas totais, lojas ativas, pedidos)
- **Gestão de Lojas**: Aprovar/bloquear lojas cadastradas
- **Gerenciamento de Categorias**: Criar, editar e excluir categorias
- **Relatórios Detalhados**: Análise de performance de cada loja
- **Gráficos de Tendências**: Visualização de vendas e pedidos ao longo do tempo

## 🎨 Design

### Paleta de Cores
- **Primária**: Azul Profundo (#1E40AF) - Confiança e profissionalismo
- **Secundária**: Amarelo Quente (#FBBF24) - Destaque e urgência
- **Neutras**: Branco, Cinza Claro, Cinza Escuro
- **Acentos**: Verde (#10B981) para sucesso, Vermelho (#EF4444) para alertas

### Tipografia
- **Display**: Poppins (700) para headings
- **Body**: Inter (400, 500, 600) para textos

### Componentes
- Utiliza **shadcn/ui** para componentes reutilizáveis
- **Tailwind CSS 4** para estilização responsiva
- **Lucide React** para ícones
- **Recharts** para gráficos de dados

## 🚀 Stack Tecnológico

- **Frontend**: React 19 + TypeScript
- **Build**: Vite
- **Estilização**: Tailwind CSS 4
- **Roteamento**: Wouter
- **Gerenciamento de Estado**: React Context API + Zustand (opcional)
- **Gráficos**: Recharts
- **Notificações**: Sonner
- **Ícones**: Lucide React

## 📦 Dados Simulados

### Lojas
1. **TechHub Eletrônicos** - Especializada em eletrônicos
2. **Papelaria Premium** - Artigos de papelaria e escritório
3. **Adega Regional** - Bebidas premium

### Produtos
- 15 produtos no total (5 por loja)
- Cada produto possui: nome, preço, imagem (emoji), categoria, estoque, rating, reviews

### Categorias
- Eletrônicos
- Papelaria
- Bebidas
- Alimentos
- Livros
- Moda

## 💾 Persistência de Dados

O projeto utiliza **LocalStorage** para manter dados entre recarregamentos:
- Modo de visualização atual
- Carrinho de compras
- Pedidos do cliente
- Pedidos do lojista

## 🔄 Fluxo de Compra

1. **Cliente** adiciona produtos ao carrinho
2. **Cliente** vai para checkout e insere nome/email
3. **Sistema** cria pedido(s) para cada loja
4. **Pedido** aparece no painel do **Lojista** como "Pendente"
5. **Lojista** atualiza status: Pendente → Enviado → Entregue
6. **Cliente** acompanha status do pedido no histórico

## 🎛️ Seletor de Modo

O header possui um seletor visual que permite alternar entre os três modos:
- **Cliente**: Modo de compra (padrão)
- **Lojista**: Dashboard de vendas
- **ADM**: Painel administrativo

A alternância é instantânea e sem necessidade de login.

## 📱 Responsividade

O projeto é totalmente responsivo:
- **Mobile**: Layout em coluna única, navegação otimizada
- **Tablet**: Grid de 2 colunas, sidebar retrátil
- **Desktop**: Layout completo com 3-4 colunas

## 🛠️ Desenvolvimento

### Instalação
```bash
cd marketplace-regional
pnpm install
```

### Desenvolvimento
```bash
pnpm dev
```

### Build
```bash
pnpm build
```

### Verificação de Tipos
```bash
pnpm check
```

## 📁 Estrutura de Pastas

```
client/
├── src/
│   ├── components/
│   │   ├── Header.tsx          # Header com seletor de modo
│   │   ├── ErrorBoundary.tsx   # Tratamento de erros
│   │   └── ui/                 # Componentes shadcn/ui
│   ├── contexts/
│   │   ├── MarketplaceContext.tsx  # Estado global
│   │   └── ThemeContext.tsx        # Tema (claro/escuro)
│   ├── pages/
│   │   ├── ClientPanel.tsx     # Painel do cliente
│   │   ├── CartPage.tsx        # Página do carrinho
│   │   ├── SellerPanel.tsx     # Painel do lojista
│   │   ├── AdminPanel.tsx      # Painel do admin
│   │   └── NotFound.tsx        # Página 404
│   ├── lib/
│   │   └── mockData.ts         # Dados simulados
│   ├── App.tsx                 # Componente raiz
│   ├── main.tsx                # Entry point
│   └── index.css               # Estilos globais
├── index.html                  # HTML template
└── public/                     # Assets estáticos
```

## 🎯 Funcionalidades Implementadas

- ✅ Alternância de painéis (Cliente/Lojista/ADM)
- ✅ Busca e filtro de produtos
- ✅ Carrinho de compras com persistência
- ✅ Checkout com informações do cliente
- ✅ Gestão de pedidos (criar, atualizar status)
- ✅ Dashboard com gráficos e KPIs
- ✅ Gestão de lojas e categorias
- ✅ Relatórios de vendas
- ✅ Design responsivo
- ✅ Notificações com Sonner
- ✅ LocalStorage para persistência

## 🚀 Próximas Melhorias

- Integração com backend real
- Autenticação de usuários
- Sistema de pagamento (Stripe)
- Upload de imagens para produtos
- Avaliações e comentários de clientes
- Sistema de notificações em tempo real
- Integração com APIs de entrega
- Dashboard de análises avançadas

## 📝 Notas

- O projeto utiliza dados simulados (mock data) para demonstração
- Todos os dados são armazenados em LocalStorage (não persistem em servidor)
- O seletor de modo permite alternar entre painéis sem autenticação
- Ideal para prototipagem e demonstração de conceitos

## 📄 Licença

MIT

---

**Desenvolvido com ❤️ usando React, TypeScript e Tailwind CSS**
