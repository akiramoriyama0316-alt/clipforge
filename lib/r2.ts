import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

export async function uploadToR2(key: string, file: Buffer, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await r2Client.send(command);
  return `${process.env.R2_ENDPOINT}/${BUCKET_NAME}/${key}`;
}

export async function getFromR2(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);
  if (!response.Body) {
    throw new Error('File not found');
  }

  const body = response.Body;
  
  if (Buffer.isBuffer(body)) {
    return body;
  }
  
  if (body instanceof ReadableStream) {
    const chunks: Uint8Array[] = [];
    const reader = body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    
    return Buffer.concat(chunks);
  }
  
  if (typeof (body as any).transformToWebStream === 'function') {
    const stream = (body as any).transformToWebStream();
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    
    return Buffer.concat(chunks);
  }
  
  if (typeof (body as any).arrayBuffer === 'function') {
    return Buffer.from(await (body as any).arrayBuffer());
  }
  
  const chunks: Uint8Array[] = [];
  for await (const chunk of body as any) {
    chunks.push(Buffer.from(chunk));
  }
  
  return Buffer.concat(chunks);
}

export async function deleteFromR2(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

export function getR2Url(key: string): string {
  return `${process.env.R2_ENDPOINT}/${BUCKET_NAME}/${key}`;
}

export function generateUniqueKey(filename: string, prefix: string = ''): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  if (prefix) {
    return `${prefix}/${timestamp}-${random}-${sanitizedFilename}`;
  }
  return `${timestamp}-${random}-${sanitizedFilename}`;
}

export async function getDownloadUrl(key: string, expiresIn: number = 300): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  // 署名付きURLを生成（デフォルト5分間有効）
  const url = await getSignedUrl(r2Client, command, { expiresIn });
  return url;
}

export async function downloadFromR2ToFile(
  key: string,
  outputPath: string
): Promise<void> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  const response = await r2Client.send(command);
  if (!response.Body) {
    throw new Error('File not found');
  }
  
  const writeStream = createWriteStream(outputPath);
  
  // ストリーミングで直接ファイルに書き込む（メモリ節約）
  if (response.Body instanceof ReadableStream) {
    const reader = response.Body.getReader();
    const writer = writeStream;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          writer.write(Buffer.from(value));
        }
      }
      writer.end();
    } catch (error) {
      writer.destroy();
      throw error;
    }
  } else if (typeof (response.Body as any).transformToWebStream === 'function') {
    const stream = (response.Body as any).transformToWebStream();
    const reader = stream.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          writeStream.write(Buffer.from(value));
        }
      }
      writeStream.end();
    } catch (error) {
      writeStream.destroy();
      throw error;
    }
  } else if (typeof (response.Body as any).arrayBuffer === 'function') {
    const buffer = Buffer.from(await (response.Body as any).arrayBuffer());
    writeStream.write(buffer);
    writeStream.end();
  } else {
    // Node.jsストリームとして処理
    await pipeline(response.Body as any, writeStream);
  }
}

