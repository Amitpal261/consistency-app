import sharp from "sharp";

export async function computeImageHash(base64DataUri: string): Promise<string> {
  const base64 = base64DataUri.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  const { data } = await sharp(buffer)
    .resize(8, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
  let hash = "";
  for (const value of data) {
    hash += value > mean ? "1" : "0";
  }
  return hash;
}

export function hammingDistance(a: string, b: string): number {
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) distance++;
  }
  return distance;
}

export const DUPLICATE_THRESHOLD_BITS = 6;