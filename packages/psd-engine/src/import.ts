import { initializeCanvas } from 'ag-psd';
import * as napi from '@napi-rs/canvas';
initializeCanvas(napi.createCanvas as any);
import { readPsd } from 'ag-psd';

export interface ImportedLayer { name: string; group: string; type: string; x: number; y: number; width: number; height: number; text?: string; visible: boolean; }
export interface ImportedSpec { width: number; height: number; layers: ImportedLayer[]; groups: string[]; }

export function importPsd(buf: Buffer): ImportedSpec {
  const r = readPsd(buf, { skipLayerImageData: true, skipCompositeImageData: true, skipThumbnail: true });
  const groups: string[] = [];
  const layers: ImportedLayer[] = [];
  function walk(list: any[], groupName: string) {
    for (const l of list || []) {
      if (l.children) {
        const gname = l.name || groupName;
        groups.push(gname);
        walk(l.children, gname);
      } else {
        layers.push({
          name: l.name || 'layer',
          group: groupName,
          type: l.text ? 'text' : 'other',
          x: l.left ?? 0,
          y: l.top ?? 0,
          width: (l.right ?? 0) - (l.left ?? 0),
          height: (l.bottom ?? 0) - (l.top ?? 0),
          text: l.text?.text,
          visible: l.visible !== false,
        });
      }
    }
  }
  walk(r.children || [], 'root');
  return { width: r.width, height: r.height, layers, groups };
}