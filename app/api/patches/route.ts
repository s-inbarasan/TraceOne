import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateUnifiedDiff } from "@/lib/utils/diff";

function isValidUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { 
      project_id, 
      repository_id, 
      file_path, 
      original_content, 
      updated_content, 
      model,
      root_cause,
      confidence_score,
      risk_analysis,
      time_estimate_minutes
    } = await req.json();

    if (!project_id) {
       return NextResponse.json({ error: "Missing required project_id field" }, { status: 400 });
    }

    // 1. Resolve or ensure project owned by authenticated user
    let project: any = null;

    if (isValidUUID(project_id)) {
      const { data: pById } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (pById) project = pById;
    }

    if (!project) {
      const { data: pBySlug } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', project_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (pBySlug) project = pBySlug;
    }

    if (!project) {
      // Auto-create or ensure project owned by user
      const slugVal = String(project_id);
      const nameVal = slugVal.startsWith('github-')
        ? slugVal.replace('github-', '').replace('-', '/')
        : 'Project';

      const insertPayload: any = {
        name: nameVal,
        slug: slugVal,
        user_id: user.id,
        source_type: 'github'
      };

      if (isValidUUID(project_id)) {
        insertPayload.id = project_id;
      }

      const { data: newProj, error: newProjErr } = await supabase
        .from('projects')
        .insert(insertPayload)
        .select('*')
        .single();

      if (newProjErr || !newProj) {
        // Fallback if specific UUID insert was rejected or slug duplicated
        const { data: fallbackProj } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallbackProj) {
          project = fallbackProj;
        } else {
          const { data: brandNewProj, error: brandNewErr } = await supabase
            .from('projects')
            .insert({
              name: 'Project',
              slug: `project-${Date.now()}`,
              user_id: user.id,
              source_type: 'github'
            })
            .select('*')
            .single();
          if (brandNewErr || !brandNewProj) {
            return NextResponse.json({ error: `Project creation failed: ${brandNewErr?.message || newProjErr?.message}` }, { status: 400 });
          }
          project = brandNewProj;
        }
      } else {
        project = newProj;
      }
    }

    const realProjectId = project.id;

    // 2. Resolve or ensure repository record
    let repoId = repository_id;
    let repoRecord: any = null;

    if (repoId && isValidUUID(repoId)) {
      const { data: rById } = await supabase
        .from('repositories')
        .select('*')
        .eq('id', repoId)
        .eq('project_id', realProjectId)
        .maybeSingle();
      if (rById) {
        repoRecord = rById;
        repoId = rById.id;
      }
    }

    if (!repoRecord) {
      const { data: rByProj } = await supabase
        .from('repositories')
        .select('*')
        .eq('project_id', realProjectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (rByProj) {
        repoRecord = rByProj;
        repoId = rByProj.id;
      }
    }

    if (!repoRecord) {
      const cleanSlug = (project.slug || project.name || 'owner/repo').replace('github-', '');
      const parts = cleanSlug.split('/');
      const ownerLogin = parts[0] || 'owner';
      const repoName = parts[1] || parts[0] || 'repo';
      const fullName = `${ownerLogin}/${repoName}`;

      const { data: newRepo, error: repoErr } = await supabase
        .from('repositories')
        .insert({
          project_id: realProjectId,
          github_id: Math.floor(Math.random() * 100000000),
          full_name: fullName,
          owner_login: ownerLogin,
          repo_name: repoName,
          default_branch: 'main',
          html_url: `https://github.com/${fullName}`
        })
        .select('*')
        .single();

      if (repoErr || !newRepo) {
        return NextResponse.json({ error: `Repository creation failed: ${repoErr?.message}` }, { status: 400 });
      }
      repoRecord = newRepo;
      repoId = newRepo.id;
    }

    // 3. Resolve or ensure incident record
    let { data: incident } = await supabase
      .from('incidents')
      .select('id')
      .eq('project_id', realProjectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!incident) {
      const { data: newIncident, error: incErr } = await supabase
        .from('incidents')
        .insert({
          project_id: realProjectId,
          repository_id: repoId,
          title: 'AI Investigation',
          error_type: 'Manual Trigger',
          status: 'open',
          severity: 'medium'
        })
        .select('id')
        .single();
      
      if (incErr || !newIncident) {
        return NextResponse.json({ error: `Incident creation failed: ${incErr?.message}` }, { status: 400 });
      }
      incident = newIncident;
    }

    // 4. Resolve or ensure investigation record
    let { data: investigation } = await supabase
      .from('investigations')
      .select('id')
      .eq('incident_id', incident.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!investigation) {
      const { data: newInv, error: invErr } = await supabase
        .from('investigations')
        .insert({
          project_id: realProjectId,
          repository_id: repoId,
          incident_id: incident.id,
          title: 'AI Patch Investigation',
          status: 'completed',
          root_cause: root_cause || null,
          confidence_score: confidence_score || null,
          risk_analysis: risk_analysis || null,
          time_estimate_minutes: time_estimate_minutes || null
        })
        .select('id')
        .single();
        
      if (invErr || !newInv) {
        return NextResponse.json({ error: `Investigation creation failed: ${invErr?.message}` }, { status: 400 });
      }
      investigation = newInv;
    } else {
      const updateData: any = {};
      if (root_cause) updateData.root_cause = root_cause;
      if (confidence_score) updateData.confidence_score = confidence_score;
      if (risk_analysis) updateData.risk_analysis = risk_analysis;
      if (time_estimate_minutes) updateData.time_estimate_minutes = time_estimate_minutes;
      updateData.status = 'completed';

      await supabase
        .from('investigations')
        .update(updateData)
        .eq('id', investigation.id);
    }

    // 5. Create analysis_runs record
    await supabase.from('analysis_runs').insert({
      investigation_id: investigation.id,
      step_name: 'AI Analysis',
      output: root_cause || `AI Analysis of ${file_path}`,
      status: 'success',
      completed_at: new Date().toISOString()
    });

    const actualDiff = generateUnifiedDiff(file_path, original_content, updated_content);

    // 6. Create patch record
    const { data: patch, error: patchErr } = await supabase
      .from('patches')
      .insert({
        investigation_id: investigation.id,
        repository_id: repoId,
        file_path,
        original_content,
        updated_content,
        unified_diff: actualDiff,
        status: 'pending',
        explanation: model ? `Generated by ${model}` : "AI Generated Patch"
      })
      .select('id')
      .single();

    if (patchErr || !patch) {
      return NextResponse.json({ error: `Patch creation failed: ${patchErr?.message}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      patch_id: patch.id,
      patchId: patch.id,
      investigation_id: investigation.id,
      investigationId: investigation.id,
      project_id: realProjectId,
      projectId: realProjectId,
      repository_id: repoId,
      repositoryId: repoId
    });

  } catch (error: any) {
    console.error("Patch store error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
