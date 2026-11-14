import { writePsdBuffer, readPsd } from 'ag-psd';
import fs from 'node:fs';

const W = 1080,
  H = 1350;

function makeImageData(w: number, h: number, r: number, g: number, b: number, a = 255) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h * 4; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return { width: w, height: h, data };
}

const psd: any = {
  width: W,
  height: H,
  children: [
    {
      name: '90_Background',
      top: 0,
      left: 0,
      bottom: H,
      right: W,
      opacity: 255,
      blendMode: 'normal',
      imageData: makeImageData(W, H, 18, 24, 40),
    },
    {
      name: '50_Overlays',
      children: [],
    },
    {
      name: '40_Imagery',
      children: [
        {
          name: 'hero-photo',
          top: 100,
          left: 80,
          bottom: 700,
          right: W - 80,
          imageData: makeImageData(W - 160, 600, 60, 120, 90),
          mask: {
            top: 100,
            left: 80,
            bottom: 700,
            right: W - 80,
            defaultColor: 0,
            density: 255,
            feather: 0,
          },
        },
      ],
    },
    {
      name: '30_Graphics',
      children: [
        {
          name: 'accent-shape',
          top: 1200,
          left: 80,
          bottom: 1280,
          right: 260,
          imageData: makeImageData(180, 80, 212, 175, 55),
          opacity: 255,
          effects: {
            dropShadow: [
              {
                blendMode: 'multiply',
                color: { r: 0, g: 0, b: 0 },
                opacity: 0.35,
                angle: 120,
                distance: { value: 6, units: 'Pixels' },
                spread: { value: 0, units: 'Pixels' },
                size: { value: 12, units: 'Pixels' },
              },
            ],
          },
        },
      ],
    },
    {
      name: '20_Brand',
      children: [
        {
          name: 'LOGO',
          top: 60,
          left: 60,
          bottom: 120,
          right: 240,
          imageData: makeImageData(180, 60, 255, 255, 255),
        },
      ],
    },
    {
      name: '10_Text',
      children: [
        {
          name: 'HEADLINE',
          text: {
            text: 'ملتقى التطوع الجامعي',
            transform: [1, 0, 0, 1, 0, 0],
            style: {
              fontSize: 72,
              fillColor: { r: 26, g: 26, b: 26 },
              font: { name: 'Cairo-Bold' } as any,
            },
            left: 80,
            top: 760,
            right: W - 80,
            bottom: 900,
            orientation: 'horizontal',
            paragraphStyle: { justification: 2 } as any,
          },
        },
        {
          name: 'SUBHEAD',
          text: {
            text: 'الجمعة 5 مساءً — انضم إلينا',
            transform: [1, 0, 0, 1, 0, 0],
            style: { fontSize: 36, fillColor: { r: 51, g: 51, b: 51 } },
            left: 80,
            top: 910,
            right: W - 80,
            bottom: 980,
          },
        },
        {
          name: 'CTA',
          text: {
            text: 'سجّل الآن',
            transform: [1, 0, 0, 1, 0, 0],
            style: { fontSize: 30, fillColor: { r: 255, g: 255, b: 255 } },
            left: 80,
            top: 1080,
            right: 360,
            bottom: 1160,
          },
        },
      ],
    },
    {
      name: '00_Guides',
      visible: false,
      children: [],
    },
  ],
};

const buf = writePsdBuffer(psd);
fs.writeFileSync('spike-output.psd', buf);
console.log('written', buf.length, 'bytes');

const r = readPsd(buf, {
  skipLayerImageData: true,
  skipCompositeImageData: true,
  skipThumbnail: true,
});
console.log(
  'read back groups:',
  r.children?.map((c: any) => c.name),
);
console.log(
  'text layer:',
  r.children?.find((c: any) => c.name === '10_Text')?.children?.[0]?.text?.text,
);
console.log(
  'mask present:',
  !!r.children?.find((c: any) => c.name === '40_Imagery')?.children?.[0]?.mask,
);
console.log(
  'effects present:',
  !!r.children?.find((c: any) => c.name === '30_Graphics')?.children?.[0]?.effects,
);
console.log(
  'effect keys:',
  Object.keys(r.children?.find((c: any) => c.name === '30_Graphics')?.children?.[0]?.effects || {}),
);
