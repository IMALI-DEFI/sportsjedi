import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const storePath = process.env.SPORTSJEDI_USAGE_FILE || path.join(os.tmpdir(),'sportsjedi-developer-usage.json');
const limits = {free:500,starter:20000,pro:100000,business:500000,enterprise:2000000};
function read() {
  try { return JSON.parse(fs.readFileSync(storePath,'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
}
function write(data) {
  fs.mkdirSync(path.dirname(storePath),{recursive:true});
  const temp = `${storePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(temp,JSON.stringify(data),{mode:0o600});
  fs.renameSync(temp,storePath);
}
export function consume(key,tier='free') {
  const limit = limits[tier] || limits.free;
  const period = new Date().toISOString().slice(0,7);
  const id = crypto.createHash('sha256').update(key).digest('hex') + ':' + period;
  const data = read();
  const used = data[id] || 0;
  if (used >= limit) return {allowed:false,used,limit,remaining:0,period};
  data[id] = used+1;
  for (const entry of Object.keys(data)) if (!entry.endsWith(':'+period)) delete data[entry];
  write(data);
  return {allowed:true,used:used+1,limit,remaining:limit-used-1,period};
}
