/**
 * Gera os assets de marca da ANL a partir de `logo.jpeg`
 * (a imagem oficial da marca: engrenagem laranja com a chave inglesa e a
 * palavra "ANL" por baixo, tal como no ficheiro original).
 *
 * Saídas geradas:
 *   public/logo.png       logo completa, fundo transparente (768 px de largura)
 *   public/logo-icon.png  só a engrenagem (sem o "ANL"), 384x384 transparente,
 *                         usada na sidebar, no login e no ecrã do quiosque
 *   app/icon.png          ícone de aplicação/favicon 512x512, fundo transparente
 *   app/apple-icon.png    ícone iOS/PWA 180x180 com fundo branco sólido
 *
 * A engrenagem isolada é obtida separando os blocos verticais de pixels da
 * marca (o primeiro bloco é a engrenagem, o segundo a palavra "ANL"), usando
 * margens proporcionais para que nenhuma ponta de dente seja cortada.
 *
 * Como funciona a transparência:
 *   1. a imagem é ampliada (Lanczos) e afinada, o que limita o ruído do JPEG;
 *   2. o branco exterior é removido por preenchimento (flood fill) a partir das
 *      margens, pelo que o branco INTERIOR da engrenagem é preservado;
 *   3. as bordas ficam com alfa parcial calculado a partir do "quanto o pixel se
 *      afasta do branco", e a cor é desmultiplicada - isto remove o halo branco
 *      que aparecia sobre fundos escuros;
 *   4. as cores das bordas são diluídas para dentro da zona transparente, para
 *      que o redimensionamento (Next.js/Image) não deixe franjas.
 *
 * Requer `sharp` (já disponível no projecto através do Next.js):
 *   node scripts/gerar-logo-assets.mjs
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const RAIZ = process.cwd();
const ORIGEM = path.join(RAIZ, "logo.jpeg");
const TMP = path.join(RAIZ, ".tmp-logo");

/** Fator de ampliação inicial: dá margem para 2x/3x de densidade de ecrã. */
const ESCALA = 3;
/** Canal mínimo e saturação máxima para considerar um pixel "branco de fundo". */
const MIN_BRANCO = 196;
const MAX_SAT = 32;
/** Denominador da cobertura: calibrado para o laranja da marca e o preto do ANL. */
const DENOM = 240;
/** Alfa abaixo do qual o pixel é simplesmente descartado (ruído de bordo). */
const ALFA_MIN = 10;
/** Fundo sólido dos ícones iOS (a Apple não suporta transparência). */
const BRANCO = { r: 255, g: 255, b: 255 };

/** Lado do `public/logo-icon.png` (engrenagem isolada, quadrada). */
const LADO_ICONE = 384;
/** Fracção do lado ocupada pela engrenagem dentro do quadrado. */
const FRACAO_ICONE = 0.98;

const limitar = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

/** Lê a imagem original, amplia-a com Lanczos e devolve RGB em bruto. */
async function lerOriginal() {
  const meta = await sharp(ORIGEM).metadata();
  const largura = Math.round(meta.width * ESCALA);
  const altura = Math.round(meta.height * ESCALA);
  const { data, info } = await sharp(ORIGEM)
    .resize({ width: largura, height: altura, kernel: "lanczos3" })
    .blur(0.4)
    .sharpen({ sigma: 0.9 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { rgb: data, largura: info.width, altura: info.height };
}

/** Separa o logótipo do fundo branco e devolve RGBA com alfa correto. */
function recortar(rgb, W, H) {
  const N = W * H;
  const fora = new Uint8Array(N); // 1 = fundo exterior (ficará transparente)
  const claros = new Uint8Array(N); // 1 = pixel claro (branco ou quase)

  for (let i = 0; i < N; i++) {
    const r = rgb[i * 3];
    const g = rgb[i * 3 + 1];
    const b = rgb[i * 3 + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (min >= MIN_BRANCO && max - min <= MAX_SAT) claros[i] = 1;
  }

  // Preenchimento a partir das margens: só o branco LIGADO ao exterior sai.
  const fila = new Int32Array(N);
  let inicio = 0;
  let fim = 0;
  const visitar = (i) => {
    if (!fora[i] && claros[i]) {
      fora[i] = 1;
      fila[fim++] = i;
    }
  };
  for (let x = 0; x < W; x++) {
    visitar(x);
    visitar((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    visitar(y * W);
    visitar(y * W + W - 1);
  }
  while (inicio < fim) {
    const i = fila[inicio++];
    const x = i % W;
    const y = (i - x) / W;
    if (x > 0) visitar(i - 1);
    if (x < W - 1) visitar(i + 1);
    if (y > 0) visitar(i - W);
    if (y < H - 1) visitar(i + W);
  }

  const rgba = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    if (fora[i]) continue; // transparente

    const r = rgb[i * 3];
    const g = rgb[i * 3 + 1];
    const b = rgb[i * 3 + 2];
    const min = Math.min(r, g, b);

    // Branco interior (ex.: miolo da engrenagem): mantém-se branco opaco.
    if (claros[i]) {
      rgba[o] = 255;
      rgba[o + 1] = 255;
      rgba[o + 2] = 255;
      rgba[o + 3] = 255;
      continue;
    }

    const cobertura = limitar((255 - min) / DENOM);
    if (cobertura <= ALFA_MIN / 255) continue; // ruído de bordo

    // Desmultiplica a cor: pixel = alfa*cor + (1-alfa)*branco.
    const cor = [r, g, b].map((c) => Math.round(limitar(255 + (c - 255) / cobertura, 0, 255)));
    rgba[o] = cor[0];
    rgba[o + 1] = cor[1];
    rgba[o + 2] = cor[2];
    rgba[o + 3] = Math.round(cobertura * 255);
  }

  return limpar(rgba, W, H);
}

/** Remove pontos soltos e dilui as cores das bordas para dentro do transparente. */
function limpar(rgba, W, H) {
  const N = W * H;
  const vizinhos = [-W - 1, -W, -W + 1, -1, 1, W - 1, W, W + 1];

  // 1) pontos soltos (ruído JPEG no fundo) -> transparente
  const apagar = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (rgba[i * 4 + 3] < 128) continue;
      let n = 0;
      for (const d of vizinhos) if (rgba[(i + d) * 4 + 3] >= 128) n++;
      if (n <= 1) apagar.push(i);
    }
  }
  for (const i of apagar) rgba[i * 4 + 3] = 0;

  // 2) dilui a cor dos bordos para as zonas transparentes (evita franjas no resize)
  for (let passo = 0; passo < 3; passo++) {
    const fonte = Buffer.from(rgba);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (fonte[i * 4 + 3] !== 0) continue;
        for (const d of vizinhos) {
          const v = (i + d) * 4;
          if (fonte[v + 3] > 0) {
            rgba[i * 4] = fonte[v];
            rgba[i * 4 + 1] = fonte[v + 1];
            rgba[i * 4 + 2] = fonte[v + 2];
            break;
          }
        }
      }
    }
  }

  return rgba;
}

/** Caixa mínima que contém a marca (alfa > 0). */
function caixaDeRecorte(rgba, W, H) {
  let minX = W;
  let minY = H;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (rgba[(y * W + x) * 4 + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Separa a marca em blocos verticais (engrenagem em cima, "ANL" em baixo).
 * Devolve cada bloco já recortado à sua caixa própria.
 */
async function separarBlocos(marca) {
  const { data, info } = await sharp(marca).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;

  const linhaTemMarca = new Uint8Array(H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] !== 0) {
        linhaTemMarca[y] = 1;
        break;
      }
    }
  }

  const blocos = [];
  for (let y = 0; y < H; ) {
    if (!linhaTemMarca[y]) {
      y++;
      continue;
    }
    const topo = y;
    while (y < H && linhaTemMarca[y]) y++;
    blocos.push({ top: topo, height: y - topo });
  }

  return Promise.all(
    blocos.map(async (b) => {
      const recorte = await sharp(marca)
        .extract({ left: 0, top: b.top, width: W, height: b.height })
        .trim({ threshold: 1 })
        .png({ compressionLevel: 9, effort: 10 })
        .toBuffer();
      return { buffer: recorte, altura: b.height };
    }),
  );
}

/** Coloca a marca (já recortada) centrada numa tela quadrada; `fundo` opcional. */
async function iconeQuadrado(marca, lado, fracao, fundo) {
  const interno = await sharp(marca)
    .resize({
      width: Math.round(lado * fracao),
      height: Math.round(lado * fracao),
      fit: "inside",
      kernel: "lanczos3",
    })
    .toBuffer();
  const { width, height } = await sharp(interno).metadata();
  return sharp({
    create: { width: lado, height: lado, channels: 4, background: fundo ?? { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: interno, left: Math.round((lado - width) / 2), top: Math.round((lado - height) / 2) }])
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();
}

async function principal() {
  await mkdir(TMP, { recursive: true });

  const { rgb, largura, altura } = await lerOriginal();
  const rgba = recortar(rgb, largura, altura);
  const caixa = caixaDeRecorte(rgba, largura, altura);
  console.log(`base ${largura}x${altura} -> marca recortada ${caixa.width}x${caixa.height}`);

  const marcaGrande = await sharp(rgba, { raw: { width: largura, height: altura, channels: 4 } })
    .extract(caixa)
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();

  const logo = await sharp(marcaGrande)
    .resize({ width: 768, kernel: "lanczos3" })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();
  await writeFile(path.join(RAIZ, "public", "logo.png"), logo);

  // A engrenagem isolada (sem o "ANL") para sidebars/logins/ecrãs compactos.
  const blocos = await separarBlocos(marcaGrande);
  if (blocos.length < 2) {
    throw new Error(`esperava 2 blocos (engrenagem + ANL), encontrei ${blocos.length}`);
  }
  await writeFile(
    path.join(RAIZ, "public", "logo-icon.png"),
    await iconeQuadrado(blocos[0].buffer, LADO_ICONE, FRACAO_ICONE),
  );

  await writeFile(path.join(RAIZ, "app", "icon.png"), await iconeQuadrado(marcaGrande, 512, 0.88));
  await writeFile(path.join(RAIZ, "app", "apple-icon.png"), await iconeQuadrado(marcaGrande, 180, 0.72, BRANCO));

  // Pré-visualizações só para inspeção (não entram no build).
  const vista = await sharp(marcaGrande).resize({ height: 260 }).toBuffer();
  const vistaIcone = await sharp(path.join(RAIZ, "public", "logo-icon.png")).resize({ height: 260 }).toBuffer();
  await sharp({ create: { width: 560, height: 320, channels: 3, background: "#ffffff" } })
    .composite([{ input: vista, gravity: "center" }])
    .png()
    .toFile(path.join(TMP, "preview-claro.png"));
  await sharp({ create: { width: 560, height: 320, channels: 3, background: "#020617" } })
    .composite([{ input: vista, gravity: "center" }])
    .png()
    .toFile(path.join(TMP, "preview-escuro.png"));
  await sharp({ create: { width: 560, height: 320, channels: 3, background: "#020617" } })
    .composite([{ input: vistaIcone, gravity: "center" }])
    .png()
    .toFile(path.join(TMP, "preview-icon.png"));

  const meta = await sharp(logo).metadata();
  const metaIcone = await sharp(path.join(RAIZ, "public", "logo-icon.png")).metadata();
  console.log(`public/logo.png ${meta.width}x${meta.height}`);
  console.log(`public/logo-icon.png ${metaIcone.width}x${metaIcone.height}`);
  console.log("app/icon.png 512x512 | app/apple-icon.png 180x180");
}

await principal();
