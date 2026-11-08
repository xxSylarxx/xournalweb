export type ToolType =
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'hand'
  | 'selectRect'
  | 'selectRegion'
  | 'line'
  | 'arrow'
  | 'doubleArrow'
  | 'rect'
  | 'ellipse'
  | 'verticalSpace'
  | 'text';

export type EraserType = 'stroke' | 'standard' | 'whiteout';

export type LineStyle = 'plain' | 'dash' | 'dot' | 'dashdot';

export type LineCap = 'round' | 'butt' | 'square';

export type ShapeType = 'freehand' | 'line' | 'arrow' | 'doubleArrow' | 'rect' | 'ellipse';

export interface Point {
  x: number;
  y: number;
  pressure: number;
  time?: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface Stroke {
  id: string;
  tool: 'pen' | 'highlighter';
  color: string;
  width: number;
  points: Point[];
  opacity: number;
  fill?: string;
  fillOpacity?: number;
  lineStyle?: LineStyle;
  capStyle?: LineCap;
  shapeType?: ShapeType;
}

export interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface ImageElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  strokes: Stroke[];
  texts?: TextElement[];
  images?: ImageElement[];
}

export type PageBackgroundType =
  | 'plain'
  | 'lined'
  | 'ruled'
  | 'graph'
  | 'dotted'
  | 'isodotted'
  | 'isograph'
  | 'staves'
  | 'pdf';

export interface PageBackground {
  type: PageBackgroundType;
  color: string;
  style?: string;
  pdfPageIndex?: number; // 1-based index in PDF document
}

export interface Page {
  id: string;
  pageNumber: number;
  width: number;  // Standard A4 default: 794 px at 96 DPI
  height: number; // Standard A4 default: 1123 px at 96 DPI
  background: PageBackground;
  layers: Layer[];
}

export interface PdfBookmark {
  title: string;
  pageIndex: number;
  children?: PdfBookmark[];
}

export interface XoppDocument {
  title: string;
  pages: Page[];
  pdfFileBuffer?: Uint8Array;
  pdfFileName?: string;
  bookmarks?: PdfBookmark[];
}
