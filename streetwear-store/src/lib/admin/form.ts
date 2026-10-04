export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const bool = (fd: FormData, k: string) => ["on", "true", "1"].includes(String(fd.get(k) ?? ""));
export const files = (fd: FormData, k: string) =>
  fd.getAll(k).filter((f): f is File => typeof f === "object" && "arrayBuffer" in f && f.size > 0);
