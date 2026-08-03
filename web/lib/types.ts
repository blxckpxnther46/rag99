export type Chat = {
  id: string;
  title: string;
  updatedAt: string;
};

export type Document = {
  id: string;
  originalName: string;
  status: string;
  sizeBytes: number;
};

export type Message = {
  id: string;
  role: string;
  content: string;
  citations?: unknown;
};
