# Studio (motor de ambientes 3D)

Base do "Studio": cenas navegáveis no navegador, com física de verdade.

- **TypeScript + Vite**, **Three.js** para desenhar e **Rapier** (WebAssembly) para colisão.
- Primeiro lugar: a chácara (`src/sites/chacara`), a partir da maquete estrutural v9 com os ajustes do Giovanni (`params.json`, lido do banco da maquete).

## Rodar

```bash
cd studio
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/ (assets/app.js com nome fixo, abre como página estática)
```

## Controles

| Modo | Teclado e mouse | Toque |
| --- | --- | --- |
| Andar | clique para olhar com o mouse, `W A S D`, `Shift` corre, `Espaço` pula | joystick anda, arrastar olha, botão Pular |
| Voar | `W A S D`, `E`/`Espaço` sobe, `Q` desce, `Shift` rápido | joystick, botões Subir/Descer |
| Visão geral | arrastar gira, rolar aproxima | pinça e dois dedos |

`V` alterna andar/voar, `G` abre a visão geral, "Voltar à janela" volta para o ponto das fotos.

## Estrutura

```
src/
  main.ts                 cena, luz, céu, laço principal, modos
  engine/
    Physics.ts            mundo Rapier, colisor de triângulos, personagem cinemático (cápsula 1,8 m)
    Input.ts              teclado, pointer lock (com alternativa de arrastar) e toque
    Landscape.ts          paisagem em volta: emenda com o terreno medido, morros, montanha, mata
    controls/             Look (olhar), FirstPerson (andar), Spectator (voar)
  sites/chacara/
    index.ts              adapta a chácara para o motor (limites, quem colide, ponto de partida, montanhas)
    legacy.js             GERADO de viewer/index.html por tools/port_legacy.py (transição)
    params.json           medidas e edições salvas na maquete
  ui/                     barra de modos, ajuda, mira, controles de toque
```

## O que colide

Construções, pedras, troncos e o terreno colidem. Água, banhado e copas de árvore não. O fosso da fogueira é recortado do chão, então dá para descer nele.

## Próximos passos

1. Trocar `legacy.js` por componentes paramétricos tipados (parede com vãos, piso, telhado, escada, árvore), cada um com `colide: boolean` e material.
2. Materiais e variantes (pintura, piso, telhado) por cenário.
3. Editor no navegador (selecionar, mover, medir) gravando a cena em JSON/glTF.
4. Substituir o terreno estimado pela nuvem de pontos do escaneamento por fotos.
