# Wrapper — Hub Alicerce (GitHub Pages)

Contorna o roteador `/u/N/` do Google embutindo a `/exec` num `<iframe credentialless>` a
partir de um dominio que nao e `google.com`. Mesmo padrao dos wrappers do #9 e #11.

```
wrapper/
├── index.html            -> https://secretaria-de-vendas-alicerce.github.io/hub-alicerce/
├── analises/index.html   -> https://secretaria-de-vendas-alicerce.github.io/hub-alicerce/analises/  (#13)
├── .nojekyll             (vazio — impede o Jekyll de comer pastas com _)
└── README.md
```

## Antes de publicar

1. Publicar a `/exec` do hub (Bloco C) e **trocar `__EXEC_URL__`** em `index.html` pela URL real
   (aparece em 2 lugares: o `src` do iframe e o link do fallback).
2. `analises/index.html` ja aponta para a `/exec @2` publicada do #13 — nao precisa mexer.

## Criar o repo + Pages (org `secretaria-de-vendas-alicerce`, `gh` ja autenticado)

Rodar de dentro de `wrapper/`:
```bash
gh repo create secretaria-de-vendas-alicerce/hub-alicerce --public --source=. --push
# habilitar Pages servindo a raiz do branch main
gh api -X POST repos/secretaria-de-vendas-alicerce/hub-alicerce/pages \
  -f "source[branch]=main" -f "source[path]=/"
```
Requisitos ja sabidos (aprendizados.md): repo **publico**; Pages source em `/ (root)`, nao
`/docs`; `.nojekyll` vazio na raiz.

## Verificar
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://secretaria-de-vendas-alicerce.github.io/hub-alicerce/
curl -s -o /dev/null -w "%{http_code}\n" https://secretaria-de-vendas-alicerce.github.io/hub-alicerce/analises/
```
Ambos devem dar **200**. Depois: teste de campo no Chrome com 2+ contas logadas — o hub abre
sem "Nao foi possivel abrir o arquivo".

> `credentialless` e Chromium-only (Chrome/Edge 110+). Firefox/Safari ignoram -> o fallback
> (link direto apos 12s) cobre esses casos.
