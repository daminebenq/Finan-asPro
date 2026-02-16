import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Database, Plus, RefreshCcw, Trash2, Save, WandSparkles } from 'lucide-react';

interface Subproject {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at?: string;
}

const MANAGED_TABLES = [
  'transactions',
  'investments',
  'goals',
  'user_profiles',
  'plan_requests',
  'plans',
] as const;

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const DatabaseStudio: React.FC = () => {
  const [projects, setProjects] = useState<Subproject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTable, setSelectedTable] = useState<(typeof MANAGED_TABLES)[number]>('transactions');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const [newRowJson, setNewRowJson] = useState('{\n  "description": "",\n  "amount": 0\n}');
  const [editRowId, setEditRowId] = useState('');
  const [editRowJson, setEditRowJson] = useState('{\n  \n}');

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const loadProjects = useCallback(async () => {
    const firstTry = await supabase
      .from('subprojects')
      .select('*')
      .order('created_at', { ascending: true });

    let data = firstTry.data;
    let error = firstTry.error;

    if (error && /created_at/i.test(error.message || '')) {
      const fallbackTry = await supabase.from('subprojects').select('*');
      data = fallbackTry.data;
      error = fallbackTry.error;
    }

    if (error) {
      toast({
        title: 'Subdatabase setup required',
        description: `Run database/subdatabase_setup.sql and database/fix_subprojects_api_access.sql in DatabasePad SQL editor. (${error.message})`,
        variant: 'destructive',
      });
      setProjects([]);
      setSelectedProjectId('');
      return;
    }

    setProjects(data || []);
    if (!selectedProjectId && data && data.length > 0) {
      setSelectedProjectId(data[0].id);
    }
  }, [selectedProjectId]);

  const loadRows = useCallback(async () => {
    if (!selectedProjectId) {
      setRows([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from(selectedTable)
      .select('*')
      .eq('project_id', selectedProjectId)
      .limit(200);

    setLoading(false);

    if (error) {
      toast({ title: `Erro ao carregar ${selectedTable}`, description: error.message, variant: 'destructive' });
      return;
    }

    setRows(data || []);
  }, [selectedProjectId, selectedTable]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const createSubproject = async () => {
    const name = newProjectName.trim();
    if (!name) return;

    const slug = slugify(name);
    const { error } = await supabase.from('subprojects').insert({
      name,
      slug,
      description: newProjectDescription.trim() || null,
    });

    if (error) {
      toast({ title: 'Erro ao criar subdatabase', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Subdatabase criada!', description: `${name} (${slug})` });
    setNewProjectName('');
    setNewProjectDescription('');
    loadProjects();
  };

  const migrateLegacyData = async () => {
    if (!selectedProjectId) return;

    setLoading(true);
    const updates = await Promise.all(
      MANAGED_TABLES.map((table) =>
        supabase
          .from(table)
          .update({ project_id: selectedProjectId })
          .is('project_id', null)
      )
    );
    setLoading(false);

    const failed = updates.find((u) => u.error);
    if (failed?.error) {
      toast({
        title: 'Falha na migração',
        description: failed.error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Migração concluída',
      description: `Dados legados movidos para ${selectedProject?.slug || 'subdatabase selecionada'}.`,
    });
    loadRows();
  };

  const createRow = async () => {
    if (!selectedProjectId) return;

    let payload: Record<string, any>;
    try {
      payload = JSON.parse(newRowJson);
    } catch {
      toast({ title: 'JSON inválido', description: 'Corrija o JSON do novo registro.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from(selectedTable).insert({
      ...payload,
      project_id: selectedProjectId,
    });

    if (error) {
      toast({ title: 'Erro ao criar registro', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Registro criado com sucesso!' });
    loadRows();
  };

  const updateRow = async () => {
    if (!editRowId) return;

    let payload: Record<string, any>;
    try {
      payload = JSON.parse(editRowJson);
    } catch {
      toast({ title: 'JSON inválido', description: 'Corrija o JSON de edição.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from(selectedTable)
      .update(payload)
      .eq('id', editRowId)
      .eq('project_id', selectedProjectId);

    if (error) {
      toast({ title: 'Erro ao atualizar registro', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Registro atualizado!' });
    loadRows();
  };

  const deleteRow = async (id: string) => {
    const { error } = await supabase
      .from(selectedTable)
      .delete()
      .eq('id', id)
      .eq('project_id', selectedProjectId);

    if (error) {
      toast({ title: 'Erro ao deletar registro', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Registro removido' });
    loadRows();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Database size={18} className="text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">DB Studio</h2>
          </div>
          <p className="text-sm text-gray-500">
            Manage logical subdatabases by project (`project_id` scope). If this is your first time, run
            <code className="mx-1 px-1.5 py-0.5 bg-gray-100 rounded">database/subdatabase_setup.sql</code>
            in DatabasePad SQL editor.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <h3 className="font-semibold text-gray-900">Subdatabases</h3>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">Selecione...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.slug})
                </option>
              ))}
            </select>
            <button
              onClick={loadProjects}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 inline-flex items-center justify-center gap-2"
            >
              <RefreshCcw size={14} /> Recarregar projetos
            </button>

            <div className="pt-2 border-t border-gray-100 space-y-2">
              <input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Nome da subdatabase"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
              />
              <input
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Descrição (opcional)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
              />
              <button
                onClick={createSubproject}
                className="w-full px-3 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 inline-flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Criar subdatabase
              </button>
            </div>

            <button
              onClick={migrateLegacyData}
              disabled={!selectedProjectId || loading}
              className="w-full px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <WandSparkles size={14} /> Mover dados legados para esta subdatabase
            </button>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value as (typeof MANAGED_TABLES)[number])}
                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
              >
                {MANAGED_TABLES.map((table) => (
                  <option key={table} value={table}>{table}</option>
                ))}
              </select>
              <button
                onClick={loadRows}
                disabled={!selectedProjectId || loading}
                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 inline-flex items-center justify-center gap-2"
              >
                <RefreshCcw size={14} /> Recarregar registros
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Criar registro (JSON)</h4>
                <textarea
                  value={newRowJson}
                  onChange={(e) => setNewRowJson(e.target.value)}
                  rows={9}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs font-mono"
                />
                <button
                  onClick={createRow}
                  disabled={!selectedProjectId}
                  className="w-full px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <Save size={14} /> Criar
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Editar registro (id + JSON)</h4>
                <input
                  value={editRowId}
                  onChange={(e) => setEditRowId(e.target.value)}
                  placeholder="ID do registro"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                />
                <textarea
                  value={editRowJson}
                  onChange={(e) => setEditRowJson(e.target.value)}
                  rows={7}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs font-mono"
                />
                <button
                  onClick={updateRow}
                  disabled={!selectedProjectId || !editRowId}
                  className="w-full px-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <Save size={14} /> Atualizar
                </button>
              </div>
            </div>

            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                {rows.length} registros em {selectedTable}
                {selectedProject ? ` · subdatabase: ${selectedProject.slug}` : ''}
              </div>
              <div className="max-h-[320px] overflow-auto">
                {rows.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">Nenhum registro encontrado.</p>
                ) : (
                  rows.map((row) => (
                    <div key={row.id || JSON.stringify(row)} className="p-3 border-b border-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">{row.id || '(sem id)'}</span>
                        {row.id && (
                          <button onClick={() => deleteRow(row.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">{JSON.stringify(row, null, 2)}</pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseStudio;
