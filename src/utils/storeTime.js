import dbConnect from '@/lib/db';
import Setting from '@/models/Setting';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const DEFAULT_TZ = 'Europe/London';

export async function getStoreTimeZone() {
  await dbConnect();
  const settings = await Setting.findOne({ key: 'store' }).lean();
  return settings?.timeZone || DEFAULT_TZ;
}

export async function getStoreDayBounds(referenceDate = new Date()) {
  const tz = await getStoreTimeZone();
  const zoned = toZonedTime(referenceDate, tz);
  const y = zoned.getFullYear();
  const m = zoned.getMonth();
  const d = zoned.getDate();

  const startLocal = new Date(y, m, d, 0, 0, 0, 0);
  const endLocal   = new Date(y, m, d + 1, 0, 0, 0, 0);

  return {
    start: fromZonedTime(startLocal, tz),
    end:   fromZonedTime(endLocal,   tz),
  };
}