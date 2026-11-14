import { initializeCanvas } from 'ag-psd';
import * as napi from '@napi-rs/canvas';
initializeCanvas(napi.createCanvas as any);
import { readPsd } from 'ag-psd';
import fs from 'node:fs';
const buf = fs.readFileSync('spike-output.psd');
const r = readPsd(buf);
console.log('read with canvas ok; layers:', r.children?.length);
console.log('text:', r.children?.find((c: any) => c.name === '10_Text')?.children?.[0]?.text?.text);
console.log('mask:', !!r.children?.find((c: any) => c.name === '40_Imagery')?.children?.[0]?.mask);
console.log(
  'effects:',
  Object.keys(r.children?.find((c: any) => c.name === '30_Graphics')?.children?.[0]?.effects || {}),
);
