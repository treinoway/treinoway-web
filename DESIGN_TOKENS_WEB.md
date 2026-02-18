# Design Tokens - Treinoway (Mobile -> Web)

Este documento consolida os tokens usados no app Flutter para facilitar a implementacao no projeto web.

## Visao geral

- **Fonte base**: `Poppins` (Google Fonts)
- **Sistema de cores**: derivado de `seedColor` com Material 3 (`ColorScheme.fromSeed`)
- **Seed color padrao atual**: `#0055FF` (Azul Institucional)
- **Escala de espacamento**: 4px base
- **Escala de borda (radius)**: 4px a 24px

## Tokens de espacamento

| Token | Valor |
|---|---:|
| `xs` | `4px` |
| `sm` | `8px` |
| `md` | `16px` |
| `lg` | `24px` |
| `xl` | `32px` |
| `xxl` | `48px` |

Sugestao (web/CSS):

```css
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-xxl: 48px;
}
```

## Tokens de radius

| Token | Valor |
|---|---:|
| `xs` | `4px` |
| `sm` | `8px` |
| `md` | `12px` |
| `lg` | `16px` |
| `xl` | `24px` |

Sugestao (web/CSS):

```css
:root {
  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}
```

## Tokens tipograficos

**Font family global**: `Poppins`

| Token | Font size | Font weight | Letter spacing | Uso |
|---|---:|---:|---:|---|
| `h1` | `24px` | `700` | normal | Titulos principais |
| `h2` | `20px` | `600` | normal | Subtitulos |
| `h3` | `18px` | `500` | normal | Titulos menores |
| `body` | `16px` | `400` | normal | Texto principal |
| `bodyMedium` | `16px` | `400` | normal | Variacao de corpo |
| `bodyLarge` | `18px` | `400` | normal | Corpo maior |
| `bodySmall` | `14px` | `400` | normal | Texto secundario |
| `buttonLabel` | `14px` | `600` | `1.25px` | Labels de botao/tag |
| `caption` | `12px` | `400` | normal | Legendas |
| `overline` | `10px` | `700` | `1.5px` | Labels pequenas em destaque |

Observacao de cor:
- `overline` usa `onSurfaceVariant` com `70%` de opacidade.
- `buttonLabel` usa cor semantica `primary`.

Sugestao (web/CSS):

```css
:root {
  --font-family-base: "Poppins", sans-serif;

  --font-h1-size: 24px;
  --font-h1-weight: 700;

  --font-h2-size: 20px;
  --font-h2-weight: 600;

  --font-h3-size: 18px;
  --font-h3-weight: 500;

  --font-body-size: 16px;
  --font-body-weight: 400;

  --font-body-small-size: 14px;
  --font-body-small-weight: 400;

  --font-button-label-size: 14px;
  --font-button-label-weight: 600;
  --font-button-label-letter-spacing: 1.25px;

  --font-caption-size: 12px;
  --font-caption-weight: 400;

  --font-overline-size: 10px;
  --font-overline-weight: 700;
  --font-overline-letter-spacing: 1.5px;
}
```

## Tokens de cor (modelo)

No mobile, as cores **nao sao fixas em hex por papel semantico**. O app gera um `ColorScheme` Material 3 a partir de um `seedColor`.

- Seed padrao: `#0055FF`
- Pode variar por contexto (ex.: preferencia de tema)
- O sistema usa papeis semanticos do Material 3 (`primary`, `onPrimary`, `surface`, `onSurface`, etc.)

Para manter paridade no web, o ideal e:

1. Usar o mesmo `seedColor`
2. Gerar palette Material 3 (tonal palette) com algoritmo equivalente
3. Expor os papeis semanticos como tokens CSS

Exemplo de nomes de tokens semanticos:

```css
:root {
  --color-primary: ...;
  --color-on-primary: ...;
  --color-primary-container: ...;
  --color-on-primary-container: ...;

  --color-secondary: ...;
  --color-on-secondary: ...;
  --color-secondary-container: ...;
  --color-on-secondary-container: ...;

  --color-tertiary: ...;
  --color-on-tertiary: ...;
  --color-tertiary-container: ...;
  --color-on-tertiary-container: ...;

  --color-surface: ...;
  --color-on-surface: ...;
  --color-surface-variant: ...;
  --color-on-surface-variant: ...;

  --color-background: ...;
  --color-on-background: ...;

  --color-error: ...;
  --color-on-error: ...;
}
```

## Temas predefinidos (Theme Settings)

Na tela de selecao de tema, existem temas com cores predefinidas vindas de `FlexColor.schemes`.
Quando um desses temas e selecionado, o app usa essas cores-base ao inves de um esquema 100% dinamico por `seedColor`.

Legenda:
- `LP`: Light Primary
- `LS`: Light Secondary
- `DP`: Dark Primary
- `DS`: Dark Secondary

| Tema | LP | LS | DP | DS |
|---|---|---|---|---|
| `material` | `#6200EE` | `#03DAC6` | `#BB86FC` | `#03DAC6` |
| `materialHc` | `#0000BA` | `#66FFF9` | `#EFB7FF` | `#66FFF9` |
| `blue` | `#1565C0` | `#039BE5` | `#90CAF9` | `#81D4FA` |
| `indigo` | `#303F9F` | `#512DA8` | `#7986CB` | `#9575CD` |
| `hippieBlue` | `#4C9BBA` | `#FF4F58` | `#669DB3` | `#FC6E75` |
| `aquaBlue` | `#35A0CB` | `#89D1C8` | `#5DB3D5` | `#A1E9DF` |
| `brandBlue` | `#3B5998` | `#55ACEE` | `#8B9DC3` | `#A0D1F5` |
| `deepBlue` | `#223A5E` | `#144955` | `#748BAC` | `#539EAF` |
| `sakura` | `#CE5B78` | `#FBAE9D` | `#EEC4D8` | `#F5D6C6` |
| `mandyRed` | `#CD5758` | `#57C8D3` | `#DA8585` | `#68CDD7` |
| `red` | `#C62828` | `#AD1457` | `#EF9A9A` | `#F8BBD0` |
| `redWine` | `#9B1B30` | `#A70043` | `#E4677C` | `#C87A98` |
| `purpleBrown` | `#450A0F` | `#60234F` | `#A98085` | `#975384` |
| `green` | `#2E7D32` | `#00695C` | `#A5D6A7` | `#80CBC4` |
| `money` | `#264E36` | `#797B3A` | `#7AB893` | `#D5D6A8` |
| `jungle` | `#004E15` | `#007256` | `#519E67` | `#479985` |
| `greyLaw` | `#37474F` | `#521D82` | `#90A4AE` | `#815AA3` |
| `wasabi` | `#738625` | `#893789` | `#C3CB77` | `#DF9ADF` |
| `gold` | `#B86914` | `#EF6C00` | `#EDA85E` | `#D28F60` |
| `mango` | `#C78D20` | `#8D9440` | `#DEB059` | `#AFB479` |
| `amber` | `#E65100` | `#2979FF` | `#FFB300` | `#82B1FF` |
| `vesuviusBurn` | `#A6400F` | `#185358` | `#D17D53` | `#5B8A8E` |
| `deepPurple` | `#4527A0` | `#0091EA` | `#B39DDB` | `#80D8FF` |
| `ebonyClay` | `#202541` | `#006B54` | `#4E597D` | `#4BA390` |
| `barossa` | `#4E0029` | `#00341A` | `#94667E` | `#6B9882` |
| `shark` | `#1D2228` | `#FB8122` | `#777A7E` | `#FCB075` |
| `bigStone` | `#1A2C42` | `#E59A18` | `#60748A` | `#EBB251` |
| `damask` | `#C96646` | `#373A36` | `#DA9882` | `#767D75` |
| `bahamaBlue` | `#095D9E` | `#DD520F` | `#4585B5` | `#E57C4A` |
| `mallardGreen` | `#2D4421` | `#D34B4B` | `#808E79` | `#E18686` |
| `espresso` | `#452F2B` | `#E3B964` | `#8D7F7D` | `#EED6A6` |
| `outerSpace` | `#1F3339` | `#D2600A` | `#486A71` | `#DB823F` |
| `blueWhale` | `#023047` | `#F86541` | `#57859D` | `#FF6E48` |
| `sanJuanBlue` | `#375778` | `#F98D94` | `#5E7691` | `#EBA1A6` |
| `rosewood` | `#5C000E` | `#74540E` | `#9C5A69` | `#EDCE9B` |
| `blumineBlue` | `#19647E` | `#FEB716` | `#82BACE` | `#FFD682` |
| `flutterDash` | `#4496E0` | `#202B6D` | `#B4E6FF` | `#99CCF9` |
| `materialBaseline` | `#6750A4` | `#625B71` | `#D0BCFF` | `#CCC2DC` |
| `verdunHemlock` | `#616200` | `#606042` | `#CBCC58` | `#C9C8A4` |
| `dellGenoa` | `#386A20` | `#55624C` | `#9CD67D` | `#BDCBB0` |
| `redM3` | `#BB1614` | `#96482B` | `#FFB4AA` | `#FFB59C` |
| `pinkM3` | `#BC004B` | `#9B4050` | `#FFB2BE` | `#FFD9DC` |
| `purpleM3` | `#9A25AE` | `#8728CF` | `#F9ABFF` | `#E0B6FF` |
| `indigoM3` | `#4355B9` | `#3C64AE` | `#BAC3FF` | `#AEC6FF` |
| `blueM3` | `#0061A4` | `#006781` | `#9ECAFF` | `#86D1EE` |
| `cyanM3` | `#006876` | `#476365` | `#44D8F1` | `#AECCCE` |
| `tealM3` | `#006A60` | `#4A635F` | `#53DBCA` | `#AECCCE` |
| `greenM3` | `#006E1C` | `#36855E` | `#7EDB7B` | `#A3F4C5` |
| `limeM3` | `#556500` | `#8C7519` | `#BCD063` | `#FFE17B` |
| `yellowM3` | `#695F00` | `#7C7B16` | `#D8C84F` | `#E9E784` |
| `orangeM3` | `#8B5000` | `#B6602F` | `#FFB871` | `#FFDBCB` |
| `deepOrangeM3` | `#BF360C` | `#BE593B` | `#FFB5A0` | `#FFDBD1` |
| `blackWhite` | `#000000` | `#000000` | `#FFFFFF` | `#FFFFFF` |
| `sepia` | `#413D32` | `#8F8880` | `#F1E8D9` | `#E5E1D6` |

> Observacao: a lista acima corresponde aos temas predefinidos disponiveis no app via `FlexColor.schemes` (versao usada no projeto).

## Observacoes de implementacao

- O Design System mobile usa Material 3 com `FlexColorScheme`.
- Radius padrao de subtemas/componentes: `12px`.
- `ElevatedButton` segue `primary` / `onPrimary`.
- Evitar cores hardcoded na camada de UI; preferir papeis semanticos.

## Referencia rapida para o colega do web

Se quiser copiar e iniciar rapido:

1. Fonte: `Poppins`
2. Seed color inicial: `#0055FF`
3. Spacing: `4, 8, 16, 24, 32, 48`
4. Radius: `4, 8, 12, 16, 24`
5. Tipografia: tabela acima
6. Cores: gerar Material 3 a partir do seed e mapear para tokens semanticos

