import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDatabase();
  const collection = db.collection('applications');
  let applications = await collection
    .find({ recruiterId: session.user.id })
    .sort({ createdAt: -1 })
    .toArray();

  if (applications.length === 0) {
    const ownedJobs = await db
      .collection('jobs')
      .find({ $or: [{ recruiterId: session.user.id }, { recruiterId: { $exists: false } }] })
      .limit(5)
      .toArray();

    const candidates = [
      ['Olivia Martin', '4 years', 'New'],
      ['Ethan Williams', '7 years', 'Reviewed'],
      ['Sophia Brown', '5 years', 'Shortlisted'],
      ['Noah Davis', '3 years', 'Rejected'],
      ['Maya Rahman', '6 years', 'New'],
    ] as const;

    const seedApplications = candidates.map(([name, experience, status], index) => {
      const firstName = name.split(' ')[0].toLowerCase();
      const job = ownedJobs[index];
      const role = String(job?.title || [
        'Frontend Developer',
        'Senior Product Designer',
        'DevOps Specialist',
        'QA Automation Engineer',
        'Product Manager',
      ][index]);

      return {
        recruiterId: session.user.id,
        jobId: job?._id?.toString() || null,
        isDummy: true,
        name,
        initials: name.split(' ').map((part) => part[0]).join(''),
        role,
        email: `${firstName}@example.com`,
        experience,
        status,
        phone: `+880 1700 000${index + 1}`,
        location: index % 2 === 0 ? 'Dhaka, Bangladesh' : 'Chattogram, Bangladesh',
        skills: role.toLowerCase().includes('design')
          ? ['Figma', 'Design Systems', 'Prototyping', 'User Research']
          : role.toLowerCase().includes('developer') || role.toLowerCase().includes('engineer')
            ? ['JavaScript', 'React', 'TypeScript', 'MongoDB']
            : ['Communication', 'Strategy', 'Planning', 'Leadership'],
        summary: `${name} is a candidate with ${experience} of relevant professional experience.`,
        createdAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
      };
    });

    await collection.insertMany(seedApplications);
    applications = await collection
      .find({ recruiterId: session.user.id })
      .sort({ createdAt: -1 })
      .toArray();
  }

  return NextResponse.json({
    applications: applications.map((application) => ({
      ...application,
      id: application._id.toString(),
      _id: undefined,
      date: application.createdAt
        ? new Date(application.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })
        : '',
    })),
  });
}
