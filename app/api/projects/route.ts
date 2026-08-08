import { NextRequest, NextResponse } from 'next/server';
import { getProjects, createProject, updateProject, deleteProject } from '@/lib/services/projects';

export async function GET() {
  try {
    const projects = await getProjects();
    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error('API /api/projects GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.repository) {
      return NextResponse.json({ error: 'Project name and repository are required' }, { status: 400 });
    }
    const project = await createProject({ name: body.name, repository: body.repository });
    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    console.error('API /api/projects POST error:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    const updated = await updateProject(id, updates);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('API /api/projects PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Project ID parameter is required' }, { status: 400 });
    }
    await deleteProject(id);
    return NextResponse.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('API /api/projects DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
