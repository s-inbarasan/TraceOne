import { NextRequest, NextResponse } from 'next/server';
import { getIncidents, updateIncident } from '@/lib/services/incidents';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const projectId = searchParams.get('projectId') || undefined;

    const incidents = await getIncidents({ status, severity, projectId });
    return NextResponse.json({ success: true, data: incidents });
  } catch (error) {
    console.error('API /api/incidents GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, incidentIds, updates } = body;

    if (action === 'bulk_update' && Array.isArray(incidentIds)) {
      const results = await Promise.all(
        incidentIds.map((id) => updateIncident(id, updates))
      );
      return NextResponse.json({ success: true, updatedCount: results.length });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (error) {
    console.error('API /api/incidents POST error:', error);
    return NextResponse.json({ error: 'Failed to execute bulk incident action' }, { status: 500 });
  }
}
