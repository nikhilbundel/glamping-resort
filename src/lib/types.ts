export type ImageCore = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  publicId?: string | null;
  focalX?: number;
  focalY?: number;
};

/** Every image field stores this shape. `mobile` is an optional art-directed variant for small screens. */
export type ImageValue = ImageCore & { mobile?: ImageCore | null };

export type CTA = {
  label: string;
  href: string;
  style?: 'primary' | 'secondary' | 'link' | 'light';
  newTab?: boolean;
};

export type MenuNode = {
  id: string;
  label: string;
  href: string;
  newTab?: boolean;
  /** Hidden items stay in the Menu Builder but are not shown on the website */
  hidden?: boolean;
  children?: MenuNode[];
};

export type Role = 'SUPER_ADMIN' | 'EDITOR';
