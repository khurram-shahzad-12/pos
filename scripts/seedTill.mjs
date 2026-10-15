import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const TILLS = [
  { name: 'Counter 1', code: 'T1' },
  { name: 'Counter 2', code: 'T2' },
  { name: 'Counter 3', code: 'T3' },
  { name: 'Counter 4', code: 'T4' },
  { name: 'Counter 5', code: 'T5' },
];

async function seedTill() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from .env.local');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Keep this schema in sync with src/models/Till.js
    const TillSchema = new mongoose.Schema(
      {
        name: { type: String, required: true },
        code: { type: String, required: true },
        active: { type: Boolean, default: true },
        printerIp: { type: String, default: '' },
        printerPort: { type: String, default: '9100' },
        stripeReaderId: { type: String, default: '' },
        stripeLocationId: { type: String, default: '' },
      },
      { timestamps: true }
    );

    const Till =
      mongoose.models.Till || mongoose.model('Till', TillSchema);

    for (const t of TILLS) {
      const existing = await Till.findOne({ code: t.code });

      if (existing) {
        // Ensure fields are set/consistent
        await Till.updateOne(
          { _id: existing._id },
          {
            $set: {
              name: t.name,
              active: true,
              printerIp: existing.printerIp ?? '',
              printerPort: existing.printerPort ?? '9100',
              stripeReaderId: existing.stripeReaderId ?? '',
              stripeLocationId: existing.stripeLocationId ?? '',
            },
          }
        );
        console.log(`${t.code} already exists — updated`);
      } else {
        await Till.create({
          name: t.name,
          code: t.code,
          active: true,
          printerIp: '',
          printerPort: '9100',
          stripeReaderId: '',
          stripeLocationId: '',
        });
        console.log(`Created ${t.code}`);
      }
    }

    const all = await Till.find().sort({ code: 1 }).lean();
    console.log(`\nTotal tills: ${all.length}`);
    all.forEach((t) => console.log(`  ${t.code} — ${t.name}`));
  } catch (error) {
    console.error('Error seeding Tills:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedTill();