import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function transcribeAudio(audioBuffer: Buffer, filename: string = 'audio.mp3'): Promise<string> {
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  const file = new File([blob], filename, { type: 'audio/mpeg' });

  const transcription = await groq.audio.transcriptions.create({
    file: file as any,
    model: 'whisper-large-v3',
    language: 'ja',
    response_format: 'text',
  });

  return transcription as unknown as string;
}

export async function transcribeVideo(videoBuffer: Buffer, startTime: number, duration: number): Promise<string> {
  // ffmpegで音声を抽出してから文字起こし
  // この実装は後でffmpeg.tsと統合
  throw new Error('Not implemented yet');
}

