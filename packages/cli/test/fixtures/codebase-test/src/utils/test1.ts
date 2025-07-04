console.log("begin-of-file");

/**
 * Splits a file into chunks and processes each chunk.
 * @param file - The file to be chunked.
 * @param chunkSize - The size of each chunk in bytes.
 * @param onChunk - Callback for processing each chunk.
 */
function handleFileChunks(
  file: File,
  chunkSize: number,
  onChunk: (chunk: Blob) => void
): void {
  const fileSize = file.size;
  let offset = 0;

  while (offset < fileSize) {
    const chunk = file.slice(offset, offset + chunkSize);
    onChunk(chunk);
    offset += chunkSize;
  }
}

// String Utilities
const split = (delimiter: string, str: string): string[] =>
  str.split(delimiter);
const join = (delimiter: string, arr: string[]): string => arr.join(delimiter);
const toUpperCase = (str: string): string => str.toUpperCase();
const toLowerCase = (str: string): string => str.toLowerCase();
const trim = (str: string): string => str.trim();
const reverseString = (str: string): string => [...str].reverse().join("");

// Math Utilities
const add = (a: number, b: number): number => a + b;
const subtract = (a: number, b: number): number => a - b;
const multiply = (a: number, b: number): number => a * b;
const divide = (a: number, b: number): number => (b === 0 ? Number.NaN : a / b);
const mod = (a: number, b: number): number => a % b;
const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

// Object Utilities
const keys = <T extends object>(obj: T): Array<keyof T> =>
  Object.keys(obj) as Array<keyof T>;
const values = <T extends object>(obj: T): Array<T[keyof T]> =>
  Object.values(obj);
const entries = <T extends object>(obj: T): Array<[keyof T, T[keyof T]]> =>
  Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
const fromEntries = <T extends object>(
  entries: Array<[keyof T, T[keyof T]]>
): T => Object.fromEntries(entries) as T;
const merge = <T extends object, U extends object>(
  obj1: T,
  obj2: U
): T & U => ({ ...obj1, ...obj2 });
const pick = <T extends object>(keys: Array<keyof T>, obj: T): Partial<T> => {
  const result: Partial<T> = {};
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
};

// Functional Utilities
type Fn<T = any, R = any> = (arg: T) => R;

const compose = <T>(...fns: Fn[]): Fn<T> => {
  return (x: T) => {
    let result = x;
    for (let i = fns.length - 1; i >= 0; i--) {
      result = fns[i](result);
    }
    return result;
  };
};

const pipe = <T>(...fns: Fn[]): Fn<T> => {
  return (x: T) => {
    let result = x;
    for (const fn of fns) {
      result = fn(result);
    }
    return result;
  };
};

const curry = <T extends (...args: any[]) => any>(fn: T) => {
  return (
    ...args: Parameters<T>
  ): ReturnType<T> | ((...args: Parameters<T>) => ReturnType<T>) =>
    args.length >= fn.length
      ? fn(...args)
      : (...more: Parameters<T>) => fn(...args.concat(more));
};

const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map<string, ReturnType<T>>();
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key)!;
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

// Higher-Order Functions
const once = <T extends (...args: any[]) => any>(fn: T): T => {
  let called = false;
  let result: ReturnType<T>;
  return ((...args: Parameters<T>) => {
    if (!called) {
      called = true;
      result = fn(...args);
    }
    return result;
  }) as T;
};

const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): T => {
  let lastCall = 0;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return fn(...args);
    }
  }) as T;
};

const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T => {
  let timeoutId: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
};
console.log("end-of-file");
