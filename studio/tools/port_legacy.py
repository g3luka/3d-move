"""Gera src/sites/chacara/legacy.js a partir da maquete v9 (viewer/index.html).
Transição: o construtor da maquete roda como está; os próximos passos vão migrar
cada elemento para componentes paramétricos tipados."""
import sys, pathlib
src = pathlib.Path(sys.argv[1]).read_text().splitlines()
L = lambda a, b: src[a-1:b]
def find(prefix, start=1):
    for i in range(start-1, len(src)):
        if src[i].startswith(prefix): return i+1
    raise SystemExit('não achei: ' + prefix)
a = find('const DEFAULTS'); b = find('let P;')
c = find('// Linhas medidas'); d = find('/* ---------- renderer')
e = find('const mat = '); f = find('/* ---------- camadas')
body = L(a, b-1) + L(c, d-1) + L(e, f-1)
out = []
for line in body:
    if line.startswith('const world = new THREE.Group(); scene.add(world);'):
        line = 'const world = new THREE.Group();'
    elif line.startswith('function addLabel('):
        line = 'function addLabel(text, X, y, Z){ labels.push({text, pos:v(X,y,Z), owner:CUR}); }'
    line = line.replace('ridge.position.set(-8,0,-5); layers.terreno.add(ridge);', '/* serra de fundo: substituída pela paisagem do Studio */')
    out.append('  ' + line)
js = ['// @ts-nocheck', '// GERADO por tools/port_legacy.py a partir de viewer/index.html (maquete v9). Não editar à mão.',
      'export function createChacara(THREE, Pin) {'] + out + [
      '  let P = Object.assign(structuredClone(DEFAULTS), structuredClone(Pin || {}));',
      '  for (const k in DEFAULTS) if (!(k in P)) P[k] = structuredClone(DEFAULTS[k]);',
      '  const ruler = { reproject(){} }; function refreshLayerVis(){}',
      '  loadRG(); build();',
      '  return { world, layers, ELS, labels, M, P, H: (X, Z) => H(X, Z) * P.escala, rebuild(){ loadRG(); build(); } };',
      '}', '']
pathlib.Path(sys.argv[2]).write_text('\n'.join(js))
print('ok', len(js))
