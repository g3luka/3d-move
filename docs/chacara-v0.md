# Chácara: maquete estrutural v0

Fase 1 do projeto: só estrutura (terreno, relevo, construções, proporções). Sem texturas, móveis ou detalhes. Precisa de aprovação antes da próxima fase.

## Fonte
- 5 fotos (Samsung SM-A315G, 4.6 mm / 25 mm equiv., 4000×2250) e 1 vídeo de 34 s, todos de 08/06/2024, tirados da mesma janela da casa.
- 1 foto mais recente (WhatsApp, 1600×900) com a fogueira pronta e o galpão.
- Fotos não ficam no repositório. Para usar a sobreposição local, salve a foto da janela em `viewer/fotos/janela.jpg`.

## Método
Uma única posição de câmera, então não há paralaxe para fotogrametria. Usei metrologia de imagem única:
- Distância focal em pixels: f ≈ 2875 px (4.6 mm sobre sensor de 6.4 mm, 4000 px).
- Plano do chão com câmera a 1,45 m e horizonte na linha 700 (inclinação de 8,4° para baixo), calibrado por:
  picape L200 (1,80 m altura, 1,77 m largura), carro prata (entre-eixos ~2,55 m), criança (~1,05 m) e adulta.
- `tools/ground_projection.py` projeta pixels no chão (X à direita, Z para a frente, em metros).
- Fogueira: diâmetro cruzado entre a área escavada (foto de 2024) e a foto da fogueira pronta.

## Estimativas (v0)
| Elemento | Valor | Confiança |
|---|---|---|
| Fogueira, diâmetro externo | 5,4 m (±0,5) | média |
| Fogueira, centro | 3,6 m à direita, 8,3 m à frente da janela | média |
| Galpão, frente | ~6,0 m (±1), telhado ~3,0 m sobre base de ~0,4 m | baixa |
| Galpão, distância | frente a ~17,5 m da janela | baixa |
| Barranco (direita) | ~4,2 m de altura, pé a ~9,5 m à direita | média |
| Talude esquerdo (para a mata) | queda ~4,5 m | baixa |
| Casa | sem fotos, volume só de referência | baixa |

## Medidas que mais melhoram o modelo
1. Diâmetro externo da fogueira.
2. Largura da frente do galpão (entre os pilares).
3. Distância da parede da casa (janela) até a borda mais próxima da fogueira.
4. Altura do peitoril da janela até o gramado.
