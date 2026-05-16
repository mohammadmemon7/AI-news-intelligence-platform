
import { pipelineService } from './modules/pipeline/pipeline.service';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const forceRun = async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Starting Force Pipeline Run...');
  const result = await pipelineService.run();
  console.log('Run Result:', result);
  await mongoose.disconnect();
};

forceRun();
