# Design Brainstorm: Marketplace Regional

## Abordagem Escolhida: **Minimalismo Corporativo com Acentos Dinâmicos**

### Design Movement
Inspirado em **Modernismo Corporativo** com influências de plataformas de e-commerce premium (Mercado Livre, Shopify). Foco em clareza, hierarquia visual e confiança.

### Core Principles
1. **Hierarquia Clara**: Distinção visual entre elementos primários (ações), secundários (informações) e terciários (contexto)
2. **Espaçamento Generoso**: Whitespace estratégico para reduzir poluição visual e melhorar legibilidade
3. **Confiança e Profissionalismo**: Paleta neutra com acentos estratégicos para criar credibilidade
4. **Responsividade Inteligente**: Layouts que se adaptam naturalmente sem perder elegância

### Color Philosophy
- **Primária**: Azul Profundo (#1E40AF) - confiança, segurança, profissionalismo
- **Secundária**: Amarelo Quente (#FBBF24) - destaque, urgência, ação (inspirado em Mercado Livre)
- **Neutras**: Cinza Claro (#F3F4F6), Branco (#FFFFFF), Cinza Escuro (#374151)
- **Acentos**: Verde para sucesso (#10B981), Vermelho para alertas (#EF4444)

**Intenção Emocional**: Transmitir confiabilidade (azul) com dinamismo (amarelo), criando uma sensação de plataforma moderna mas segura.

### Layout Paradigm
- **Header Sticky**: Navegação e seletor de modo sempre acessível
- **Grid Assimétrico**: Produtos em grid 3-4 colunas (desktop), com cards de destaque maiores intercalados
- **Sidebar Contextual**: Painéis de lojista/admin com sidebar esquerda retrátil
- **Seções com Ritmo**: Alternância entre fundo branco e cinza claro para criar divisão visual

### Signature Elements
1. **Badge de Modo**: Seletor visual destacado no header (Cliente/Lojista/ADM) com animação de transição
2. **Cards com Sombra Suave**: Profundidade via `shadow-sm` com hover elevation
3. **Dividers Horizontais**: Linhas cinza claro para separar seções sem rigidez

### Interaction Philosophy
- **Transições Suaves**: Todas as mudanças de estado com `transition-all duration-200`
- **Feedback Imediato**: Hover states, loading states e confirmações visuais
- **Modo Claro**: Fundo claro por padrão para melhor legibilidade em ambientes variados

### Animation
- **Entrada de Componentes**: Fade-in suave (opacity 0→1, 200ms)
- **Hover em Cards**: Elevação sutil (shadow-sm → shadow-md) + scale(1.02)
- **Transição de Modo**: Fade entre painéis (200ms), sem rotações ou efeitos agressivos
- **Loading States**: Spinner com rotação suave, nunca agressivo

### Typography System
- **Display (Headings)**: Poppins Bold (700) para h1/h2, tamanhos 28px/24px
- **Body**: Inter Regular (400) para texto principal, 14px/16px
- **Emphasis**: Inter SemiBold (600) para destaques em corpo de texto
- **Labels**: Inter Medium (500) para labels de formulário e badges

**Hierarquia**:
- h1: Poppins 700, 28px, leading-tight
- h2: Poppins 700, 24px, leading-snug
- h3: Poppins 600, 18px, leading-snug
- Body: Inter 400, 14px, leading-relaxed
- Small: Inter 400, 12px, leading-relaxed

---

## Alternativas Descartadas

### Opção 2: Design Playful (Probabilidade: 0.08)
Cores vibrantes, rounded corners agressivos, ilustrações custom. Descartada por parecer menos profissional para um marketplace B2B.

### Opção 3: Design Maximalista (Probabilidade: 0.07)
Padrões complexos, gradientes ousados, tipografia experimental. Descartada por comprometer legibilidade e confiança.

---

## Implementação
- Adicionar Google Fonts: Poppins (700) + Inter (400, 500, 600)
- Configurar CSS variables em `index.css` com a paleta escolhida
- Aplicar design tokens em todos os componentes
- Manter consistência através de componentes reutilizáveis
