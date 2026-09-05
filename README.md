# guararai.com

Portfólio pessoal de Davi Santos — desenvolvedor front-end e web designer em São Paulo. Publicado com GitHub Pages a partir da branch `main`, no domínio `www.guararai.com` (`CNAME`).

## Stack

HTML, CSS e JavaScript escritos à mão, sem framework nem etapa de build. A única dependência é o [Lenis](https://lenis.dev) (smooth scroll, MIT), vendorizado em `assets/js/vendor/`.

## Estrutura

```
index.html             página única
assets/css/style.css   tokens, layout, motion
assets/js/scroll.js    Lenis + engine de efeitos de scroll (data-parallax, data-marquee)
assets/js/main.js      nav, âncoras, reveals de texto, cones de luz, capas de projeto
assets/js/vendor/      lenis.min.js + licença
assets/fonts/          Spectral e JetBrains Mono (woff2, subset latin, OFL)
assets/img/            fotos do Unsplash em WebP + CREDITS.txt
```

## Rodar localmente

Qualquer servidor estático na raiz do repositório:

```
python -m http.server 8000
```

Abrir `index.html` direto no navegador também funciona — todos os caminhos são relativos.

## Créditos

Fontes: [Spectral](https://fonts.google.com/specimen/Spectral) e [JetBrains Mono](https://www.jetbrains.com/lp/mono/), SIL Open Font License (textos em `assets/fonts/`). Fotos: [Unsplash](https://unsplash.com/license); autores listados em `assets/img/CREDITS.txt`.
