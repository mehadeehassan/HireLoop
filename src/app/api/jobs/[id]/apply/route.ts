import { auth } from '@/lib/auth';
import { fetchBackendJobs, submitBackendApplication } from '@/lib/job-api';
import { getDatabase } from '@/lib/mongodb';
import { toPublicJob } from '@/lib/public-jobs';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

type BackendJob = {
  _id?: string;
  id?: string;
  recruiterId?: string;
};

type ApplicationDetails = {
  name: string;
  phone: string;
  location: string;
  experience: string;
  skills: string[];
  linkedinUrl: string | null;
  resumeUrl: string | null;
  resumeFile: { name: string; type: 'application/pdf'; data: string } | null;
  portfolioUrl: string | null;
  coverLetter: string;
};

const maxResumeSize = 5 * 1024 * 1024;

function isBackendJob(value: unknown): value is BackendJob {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getOptionalUrl(value: unknown) {
  const rawUrl = getString(value);
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function getLinkedInUrl(value: unknown) {
  const url = getOptionalUrl(value);
  if (!url) return value ? undefined : null;

  const hostname = new URL(url).hostname.toLowerCase();
  return hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com') ? url : undefined;
}

function getApplicationDetails(value: unknown):
  | { details: ApplicationDetails; error: null }
  | { details: null; error: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { details: null, error: 'Please provide your application details.' };
  }

  const body = value as Record<string, unknown>;
  const name = getString(body.name);
  const phone = getString(body.phone);
  const location = getString(body.location);
  const experience = getString(body.experience);
  const skills = Array.isArray(body.skills)
    ? body.skills
        .filter((skill): skill is string => typeof skill === 'string')
        .map((skill) => skill.trim())
        .filter(Boolean)
        .slice(0, 30)
    : typeof body.skills === 'string'
      ? body.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean)
          .slice(0, 30)
      : [];
  const linkedinUrl = getLinkedInUrl(body.linkedinUrl);
  const resumeUrl = getOptionalUrl(body.resumeUrl);
  const resumeFileValue = body.resumeFile;
  const portfolioUrl = getOptionalUrl(body.portfolioUrl);
  const coverLetter = getString(body.coverLetter);
  let resumeFile: ApplicationDetails['resumeFile'] = null;

  if (resumeFileValue !== null && resumeFileValue !== undefined) {
    if (!isRecord(resumeFileValue)) {
      return { details: null, error: 'Please upload a valid PDF resume.' };
    }

    const name = getString(resumeFileValue.name);
    const data = resumeFileValue.data;
    const pdfHeader =
      typeof data === 'string' ? Buffer.from(data, 'base64').subarray(0, 5).toString('ascii') : '';
    if (
      !name.toLowerCase().endsWith('.pdf') ||
      resumeFileValue.type !== 'application/pdf' ||
      typeof data !== 'string' ||
      data.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(data) ||
      Buffer.byteLength(data, 'base64') > maxResumeSize ||
      pdfHeader !== '%PDF-'
    ) {
      return {
        details: null,
        error: 'Resume must be a PDF file no larger than 5 MB.',
      };
    }
    resumeFile = { name: name.replace(/[\\/]/g, '_').slice(0, 180), type: 'application/pdf', data };
  }

  if (!name || !phone || !location || !experience || skills.length === 0) {
    return {
      details: null,
      error: 'Name, phone, location, experience, and at least one skill are required.',
    };
  }
  if (name.length > 120 || phone.length > 40 || location.length > 160 || experience.length > 160) {
    return { details: null, error: 'One or more profile fields are too long.' };
  }
  if (body.resumeUrl && !resumeUrl) {
    return { details: null, error: 'Resume URL must be a valid HTTP or HTTPS URL.' };
  }
  if (linkedinUrl === undefined) {
    return { details: null, error: 'LinkedIn URL must be a valid linkedin.com URL.' };
  }
  if (resumeUrl && resumeFile) {
    return { details: null, error: 'Use either a resume URL or upload a PDF, not both.' };
  }
  if (body.portfolioUrl && !portfolioUrl) {
    return { details: null, error: 'Portfolio URL must be a valid HTTP or HTTPS URL.' };
  }
  if (coverLetter.length > 5000) {
    return { details: null, error: 'Cover letter must be 5,000 characters or fewer.' };
  }

  return {
    details: {
      name,
      phone,
      location,
      experience,
      skills,
      linkedinUrl,
      resumeUrl,
      resumeFile,
      portfolioUrl,
      coverLetter,
    },
    error: null,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Sign in to apply for this job.' }, { status: 401 });
  }
  if (session.user.role !== 'seeker') {
    return NextResponse.json(
      { error: 'Only job seekers can apply for jobs.' },
      { status: 403 },
    );
  }

  const { id } = await params;
  let submittedDetails: unknown;
  try {
    submittedDetails = await request.json();
  } catch {
    return NextResponse.json({ error: 'Application details must be valid JSON.' }, { status: 400 });
  }

  try {
    const { details, error } = getApplicationDetails(submittedDetails);
    if (!details) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const { response, data } = await fetchBackendJobs('GET', { id });
    if (response.status === 404) {
      return NextResponse.json({ error: 'This job is no longer available.' }, { status: 404 });
    }
    if (!response.ok) {
      console.error('Job application lookup failed', response.status);
      return NextResponse.json({ error: 'Could not load this job.' }, { status: 502 });
    }
    if (!isBackendJob(data)) {
      return NextResponse.json({ error: 'This job is no longer available.' }, { status: 404 });
    }
    const job = toPublicJob(data);
    if (!job) {
      return NextResponse.json({ error: 'This job is no longer available.' }, { status: 404 });
    }

    const recruiterId = data.recruiterId?.trim();
    const jobId = String(data.id || data._id || id);
    if (!recruiterId) {
      console.error('Cannot accept an application for a job without a recruiter', jobId);
      return NextResponse.json(
        { error: 'Applications are unavailable for this job.' },
        { status: 409 },
      );
    }

    const db = await getDatabase();
    const applications = db.collection('applications');
    await applications.createIndex(
      { candidateId: 1, jobId: 1 },
      {
        unique: true,
        partialFilterExpression: {
          candidateId: { $type: 'string' },
          jobId: { $type: 'string' },
        },
      },
    );
    const existingApplication = await applications.findOne({
      candidateId: session.user.id,
      jobId,
    });
    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied for this job.', alreadyApplied: true },
        { status: 409 },
      );
    }

    const candidateDetails = {
      ...details,
      email: session.user.email,
      image: session.user.image || '',
    };
    const createdAt = new Date();
    const profileDetails = {
      name: details.name,
      phone: details.phone,
      location: details.location,
      experience: details.experience,
      skills: details.skills,
      linkedinUrl: details.linkedinUrl,
      resumeUrl: details.resumeUrl,
      portfolioUrl: details.portfolioUrl,
      coverLetter: details.coverLetter,
    };
    await db.collection('seeker_profiles').updateOne(
      { candidateId: session.user.id },
      {
        $set: {
          ...profileDetails,
          email: session.user.email,
          image: session.user.image || '',
          candidateId: session.user.id,
          updatedAt: createdAt,
        },
        $setOnInsert: { createdAt },
      },
      { upsert: true },
    );

    const application = {
      recruiterId,
      candidateId: session.user.id,
      jobId,
      jobTitle: job.title,
      company: job.company,
      isDummy: false,
      ...candidateDetails,
      initials: details.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join(''),
      role: job.title,
      status: 'New',
      summary: details.coverLetter || `${details.name} applied for ${job.title}.`,
      candidateDetails,
      createdAt,
      updatedAt: createdAt,
    };

    const { response: backendResponse } = await submitBackendApplication(application);
    if (!backendResponse.ok) {
      console.error('Application backend rejected submission', backendResponse.status);
      return NextResponse.json(
        { error: 'The application service could not accept your application. Please try again.' },
        { status: 502 },
      );
    }

    try {
      await applications.insertOne(application);
    } catch (insertError) {
      if (
        typeof insertError === 'object' &&
        insertError !== null &&
        'code' in insertError &&
        insertError.code === 11000
      ) {
        return NextResponse.json(
          { error: 'You have already applied for this job.', alreadyApplied: true },
          { status: 409 },
        );
      }
      console.error('Application was submitted but could not be synced locally', insertError);
      return NextResponse.json(
        {
          success: true,
          warning:
            'Your application was submitted, but it could not be synced to the recruiter dashboard.',
        },
        { status: 201 },
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Could not submit job application', error);
    return NextResponse.json({ error: 'Could not submit your application.' }, { status: 502 });
  }
}
