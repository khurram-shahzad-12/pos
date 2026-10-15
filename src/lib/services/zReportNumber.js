import dbConnect from '@/lib/db';
import ZReport from '@/models/ZReport';
import Till from '@/models/Till';

export async function nextZReportNumber(tillId) {
  await dbConnect();
  const till = await Till.findById(tillId).lean();
  if (!till) throw new Error('Till not found');

  const count = await ZReport.countDocuments({ tillId });
  return `${till.code}-Z${String(count + 1).padStart(6, '0')}`;
}