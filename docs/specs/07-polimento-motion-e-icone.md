# 07 · Polimento: motion, haptics, ícone, splash e desempenho no J6

Leia junto: `docs/DESIGN_SYSTEM.md` (motion), `docs/BRAND.md` (ícone e splash),
`docs/research/03-ux-adicionar-alimento.md` (seção 5),
`~/.codex/skills/vercel-react-native-skills` (list-performance, animation).

## Objetivo

Fazer o app **parecer** o produto premium que a estrutura já é: cada transição
com propósito, números que rolam, feedback tátil discreto, ícone e splash de
verdade — sem perder fluidez no Galaxy J6.

## Decisões fechadas

### Vocabulário único (`src/theme/motion.ts`)

Garanta que todo animado do app usa apenas estes presets (revise o código;
valores soltos são defeito):

| Momento | Preset |
| --- | --- |
| Pressed em linha/chip/botão | 100 ms, opacidade 0,85 ou escala 0,98 |
| Chip de porção, passo do stepper | 120 ms |
| "+" → "✓" | 200 ms standard, escala 0,8 → 1 |
| Folha entra / sai | 300 ms emphasized-decelerate / 200 ms emphasized-accelerate |
| Count-up de números | 250–350 ms ease-out, `tabular-nums` |
| Barra de progresso | 400 ms standard, a partir do valor anterior |
| Snackbar | entra 150 ms, sai 100 ms, fica 4 s |
| Lista de resultados | stagger 20 ms por linha, máx. 6 linhas, opacidade + translateY 8 dp |
| Troca de dia em "Hoje" | crossfade 180 ms |
| Erro | shake sutil 200 ms (2 ciclos, 4 dp) |

- `ReduceMotion.System` em todos; com reduced motion ativo: crossfades de
  120 ms, sem stagger, sem count-up (número troca direto), barras sem animar.
- Só `transform` e `opacity` no thread de UI; nunca animar `height` de linha;
  nada de blur, sombra grande ou Lottie.

### Haptics (`src/components/haptics.ts`)

| Evento | Android (`react-native-haptic-feedback`) | iOS |
| --- | --- | --- |
| Chip / passo do stepper | `clockTick` | `selection` |
| "+" adicionou | `effectClick` (leve) | `impactLight` |
| "Concluir" | `effectDoubleClick` uma vez por sessão | `notificationSuccess` |
| Erro | `effectHeavyClick` | `notificationError` |

Nunca `Vibration.vibrate(ms)`. Respeita a preferência "Vibração ao registrar".

### Ícone e splash

- Ícone adaptativo Android a partir de `assets/brand/` (SVG mestre): foreground
  na safe zone de 66 dp em 108 dp, background sólido na cor do brand, variante
  monocromática para tema dinâmico (`mipmap-anydpi-v33`). Gere os PNGs de todas
  as densidades com um script Node (`scripts/generate-brand-assets.mjs` usando
  `sharp` como devDependency) — nunca redimensionar um PNG grande à mão.
- iOS: `AppIcon.appiconset` completo com o mesmo script (1024 px e demais).
- Splash Android (`android/app/src/main/res/drawable/splash_icon.xml` + tema
  `Theme.App.SplashScreen` ou equivalente disponível no template): fundo na cor
  do app, símbolo centralizado, versão night. Sem biblioteca de splash extra
  se o template resolver.
- Nome do app na launcher = nome da marca em `docs/BRAND.md`.

### Desempenho no J6 (evidência obrigatória no summary)

- `adb shell am start -W` (rodado pelo tester via requestedSteps ou pelo lead
  em verificação local se houver device — o lead não bloqueia por isso):
  `TotalTime` de cold start ≤ 2.500 ms no J6.
- Listas com FlashList e `estimatedItemSize` correto; `getItemType` quando há
  tipos diferentes; callbacks estáveis; sem objetos inline em estilo.
- Busca local: resultado em < 100 ms após o debounce (log em dev).
- Nenhum `console.log` em produção; `__DEV__` guardado.

### Micro-detalhes de acabamento

- Skeleton para o único carregamento real (busca online) com a forma da linha.
- Estados pressed em todos os toques (nada "morto" ao tocar).
- Status bar e navigation bar com cores do tema (edge-to-edge respeitando
  insets).
- Teclado: nada coberto; a bandeja da busca fica acima do teclado.

## Fora de escopo

Mudar layout, cores, hierarquia ou copy de qualquer tela; features novas.

## Evidência esperada no device

1. Ícone novo na tela inicial do Android (screenshot da home após instalar) e
   splash ao abrir (checkpoint imediato após o launch).
2. Fluxo completo Adicionar → "+" → "Concluir" com screenshots consecutivos; o
   tester não mede animação, mas confirma ausência de regressão de layout e a
   presença dos estados pressed/✓.
3. Tema escuro (`night yes`) em "Hoje", busca e folha de porção.
4. `am start -W` com `TotalTime` reportado nas observações.
