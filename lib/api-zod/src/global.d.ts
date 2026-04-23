declare global {
  interface File {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  }

  interface Blob {
    size: number;
    type: string;
  }
}

export {};
