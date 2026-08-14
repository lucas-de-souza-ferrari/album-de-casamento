import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function getVideoDurationSeconds(filePath) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  const seconds = Number.parseFloat(stdout.trim());
  return Number.isFinite(seconds) ? seconds : null;
}

// Extrai um frame como poster/thumbnail. -ss antes de -i busca por keyframe
// proximo, o que e rapido mas pode falhar em clipes muito curtos; quem chama
// deve tentar de novo com atSeconds=0 nesse caso.
export async function extractVideoFrame(inputPath, outputPath, atSeconds, width) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-ss', String(atSeconds),
    '-i', inputPath,
    '-frames:v', '1',
    '-vf', `scale=${width}:-2`,
    outputPath,
  ]);
}
