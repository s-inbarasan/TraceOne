import { NextRequest, NextResponse } from 'next/server';
import { getIncidentById, updateIncident } from '@/lib/services/incidents';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const incident = await getIncidentById(id);
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: incident });
  } catch (error) {
    console.error('API /api/incidents/[id] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch incident' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateIncident(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('API /api/incidents/[id] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const archived = await updateIncident(id, { status: 'archived' });
    return NextResponse.json({ success: true, data: archived });
  } catch (error) {
    console.error('API /api/incidents/[id] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to archive incident' }, { status: 500 });
  }
}
